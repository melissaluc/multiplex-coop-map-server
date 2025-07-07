import parquet from "parquetjs-lite";
import { PassThrough, Writable } from "stream";
import { Buffer } from "buffer";
import { simplify } from "@turf/turf";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import {
  VARCHAR,
  type DuckDBConnection,
  type DuckDBResult,
} from "@duckdb/node-api";
import { getConnection } from "../data/database/connection.js";
const connection = await getConnection();

export function convertQueryToGeoJSON(
  rows: Array<any>
): FeatureCollection<Geometry, GeoJsonProperties> {
  const featCollection = {
    type: "FeatureCollection",
    features: rows.map((row: any) => {
      const { geometry, ...rest } = row as {
        geometry: string;
      } & GeoJsonProperties;

      return {
        type: "Feature",
        geometry: JSON.parse(geometry),
        properties: rest,
      };
    }),
  };

  const simplifiedGeometry = simplify(featCollection, {
    tolerance: 0.0001,
    highQuality: false,
    mutate: true,
  });
  return simplifiedGeometry;
}

async function batchStreamRows<T>(
  stream: AsyncIterable<T>,
  batchSize: number,
  handleBatch: (batch: T[]) => Promise<void>
) {
  let batch: T[] = [];

  for await (const row of stream) {
    if (batch.length >= batchSize) {
      await handleBatch(batch);
      batch = [];
    }
    batch.push(row);
  }
  if (batch.length > 0) {
    await handleBatch(batch);
  }
}

export async function streamQueryToParquetBuffer(
  query: string,
  numberOfRows: number
): Promise<Buffer> {
  const resultStream = await connection.stream(query);
  const rawSchema = resultStream.columnNamesAndTypesJson() as {
    columnNames: string[];
    columnTypes: { typeId: number; alias?: string }[];
  };
  console.log("Raw Schema: ", rawSchema);
  const asyncStream = asyncIterableFromStreamResult(resultStream, numberOfRows);
  const inMemoryStream = new PassThrough();
  const chunks: Buffer[] = [];

  const sink = new Writable({
    write(chunk, _, cb) {
      chunks.push(chunk);
      cb();
    },
  });

  inMemoryStream.pipe(sink);
  let writer: parquet.ParquetWriter | undefined;

  const schema = buildParquetSchema(
    rawSchema.columnNames,
    rawSchema.columnTypes
  );

  let initialized = false;
  const batchSize = 100_000;

  await batchStreamRows(asyncStream, batchSize, async (rows) => {
    if (!initialized && rows.length > 0) {
      writer = await parquet.ParquetWriter.openStream(schema, inMemoryStream);
      initialized = true;
      console.log("Initialized writer with schema");
    }
    console.log("Processing batching:", rows.length);
    for (const row of rows) {
      // const safeRow = normalizeParquetRow(row);
      await writer.appendRow(row);
    }
  });
  // console.log("Finished batch stream rows:", chunks);

  await writer.close();

  return Buffer.concat(chunks);
}

function arrayToObjectRow(
  row: any[],
  columnNames: string[]
): Record<string, any> {
  const obj: Record<string, any> = {};
  for (let i = 0; i < columnNames.length; i++) {
    obj[columnNames[i]] = row[i];
  }
  return obj;
}

function buildParquetSchema(columnNames: string[], columnTypes: any[]) {
  const schemaShape: Record<string, { type: string; optional: boolean }> = {};

  for (let i = 0; i < columnNames.length; i++) {
    const name = columnNames[i];
    const typeMeta = columnTypes[i];
    const duckType = typeMeta.alias || duckTypeIdToAlias[typeMeta.typeId];

    let parquetType: string;

    switch (duckType.toUpperCase()) {
      case "BOOLEAN":
        parquetType = "BOOLEAN";
        break;
      case "TINYINT":
      case "SMALLINT":
      case "INTEGER":
      case "BIGINT":
      case "UTINYINT":
      case "USMALLINT":
      case "UINTEGER":
      case "UBIGINT":
      case "HUGEINT":
      case "UHUGEINT":
        parquetType = "INT64";
        break;
      case "FLOAT":
      case "DOUBLE":
      case "DECIMAL":
        parquetType = "DOUBLE";
        break;
      case "BLOB":
      case "GEOMETRY":
        parquetType = "UTF8";
        break;
      case "VARCHAR":
      default:
        parquetType = "UTF8";
    }

    schemaShape[name] = {
      type: parquetType,
      optional: true,
    };
  }

  return new parquet.ParquetSchema(schemaShape);
}

function normalizeParquetRow(row: Record<string, any>) {
  const fixed: { [key: string]: any } = {};
  for (const [key, value] of Object.entries(row)) {
    console.log(key, ":", value);

    if (value?.constructor?.name === "DuckDBBlobValue") {
      const bytes = value.bytes;
      if (key === "geometry") {
        let geometryBytes = Uint8Array.from(bytes);
        const endianByte = geometryBytes[0];
        const knownTypeIDs = [1, 3, 4, 5, 6];
        if (![0x00, 0x01].includes(endianByte)) {
          console.warn(
            `⚠️ Invalid WKB endian byte: ${endianByte} — fixing to 0x01`
          );
          geometryBytes[0] = 0x01; // force little-endian
        }

        // Optional: patch suspicious type IDs
        const typeID = geometryBytes[1];
        if (!knownTypeIDs.includes(typeID)) {
          console.warn(
            `🛑 Suspicious WKB type byte: ${typeID} — consider skipping or logging`
          );
        }

        fixed[key] = Buffer.from(geometryBytes);
      } else {
        fixed[key] = Buffer.isBuffer(value.bytes)
          ? value.bytes
          : Buffer.from(new Uint8Array(value.bytes));
      }
    } else {
      fixed[key] = value;
    }
  }
  return fixed;
}

async function* asyncIterableFromStreamResult(
  streamResult: DuckDBResult,
  numberOfRows: number
) {
  let chunk;
  let totalRows = 0;
  const columnNames = streamResult.columnNames();
  while (totalRows < numberOfRows) {
    chunk = await streamResult.fetchChunk();
    const rows = chunk?.getRows();
    if (rows && rows.length > 0) {
      for (const row of rows) {
        yield arrayToObjectRow(row, columnNames);
      }
      totalRows = totalRows + rows.length;
    }
  }
}

const duckTypeIdToAlias: Record<number, string> = {
  0: "INVALID",
  1: "BOOLEAN",
  2: "TINYINT",
  3: "SMALLINT",
  4: "INTEGER",
  5: "BIGINT",
  6: "UTINYINT",
  7: "USMALLINT",
  8: "UINTEGER",
  9: "UBIGINT",
  10: "FLOAT",
  11: "DOUBLE",
  12: "TIMESTAMP",
  13: "DATE",
  14: "TIME",
  15: "INTERVAL",
  16: "HUGEINT",
  17: "VARCHAR",
  18: "BLOB",
  19: "DECIMAL",
  20: "TIMESTAMP_S",
  21: "TIMESTAMP_MS",
  22: "TIMESTAMP_NS",
  23: "ENUM",
  24: "LIST",
  25: "STRUCT",
  26: "MAP",
  27: "UUID",
  28: "UNION",
  29: "BIT",
  30: "TIME_TZ",
  31: "TIMESTAMP_TZ",
  32: "UHUGEINT",
  33: "ARRAY",
};
