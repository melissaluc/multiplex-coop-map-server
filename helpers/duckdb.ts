import parquet from "parquetjs-lite";
import { PassThrough, Writable } from "stream";
import { Buffer } from "buffer";
import { simplify } from "@turf/turf";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { DuckDBResult } from "@duckdb/node-api";
import { getConnection } from "@/database/connection.js";
const connection = await getConnection();

export function convertQueryToGeoJSON(
  rows: Array<any>
): FeatureCollection<Geometry, GeoJsonProperties> {
  const featCollection: FeatureCollection = {
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
      await writer.appendRow(row);
    }
  });
  console.log("Finished batch stream rows");

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
