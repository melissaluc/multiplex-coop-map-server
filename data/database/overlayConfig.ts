type FiltersPostBody = Record<string, boolean>;
type QueryFieldValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number>;
type QueriesPostBody = Record<string, Record<string, QueryFieldValue>>;

type PostBody = {
  filters: FiltersPostBody;
  queries: QueriesPostBody;
};

export function mapPostBodyToOverlayData(postBody: PostBody) {
  const { filters, queries } = postBody;
  filterOverlayData.map((overlay) => {
    const toSkip = filters?.[overlay.newName];
    return {
      ...overlay,
      skipDataset: toSkip || false,
    };
  });
  queryOverlayData.map((overlay) => {
    const userQuery = queries?.[overlay.newName];
    if (!userQuery) return overlay;

    const updatedQueryValues = overlay.queryValues?.map((query) => {
      const newValue = userQuery?.[query.field];
      return {
        ...query,
        value: newValue || query.value,
      };
    });
    return {
      ...overlay,
      queryValues: updatedQueryValues,
    };
  });
}

type QueryValues = {
  field: string;
  value: string | number | null | boolean | Array<string | number>;
  filterCondition: string | null;
};

type OverlayData = {
  name: string;
  newName: string;
  shortName: string;
  returnFields: Array<string>;
  skipDataset?: boolean;
  queryValues?: Array<QueryValues>;
};

const filterOverlayData: Array<OverlayData> = [
  {
    name: "Parking Zone Overlay - 4326",
    shortName: "pzo",
    newName: "ParkingZoneOverlay",
    returnFields: ["ZN_PARKZONE", "geometry"],
    skipDataset: false,
  },
  {
    name: "City Wards Data - 4326",
    shortName: "cwd",
    newName: "WardBoundaries",
    returnFields: ["AREA_NAME", "AREA_SHORT_CODE", "geometry"],
  },
  {
    name: "Zoning Building Setback Overlay - 4326",
    shortName: "zbso",
    newName: "ZoningBuildingSetbackOverlay",
    returnFields: ["BYLAW_SECTIONLINK", "geometry"],
  },
  {
    name: "Zoning Policy Area Overlay - 4326",
    shortName: "zpao",
    newName: "ZoningPolicyAreaOverlay",
    returnFields: ["POLICY_ID", "CHAPT_200", "geometry"],
  },
];

const queryOverlayData: Array<OverlayData> = [
  {
    name: "Zoning Height Overlay - 4326",
    shortName: "zho",
    newName: "ZoningHeightOverlay",
    returnFields: ["geometry", "HT_STORIES", "HT_LABEL"],
    queryValues: [
      {
        field: "HT_STORIES",
        value: null,
        filterCondition: ">=",
      },
      {
        field: "HT_LABEL",
        value: null,
        filterCondition: ">=",
      },
    ],
  },
  {
    name: "Zoning Lot Coverage Overlay - 4326",
    shortName: "zlco",
    newName: "ZoningLotCoverageOverlay",
    returnFields: ["PRCNT_CVER", "geometry"],
    queryValues: [
      {
        field: "PRCNT_CVER",
        value: null,
        filterCondition: null,
      },
    ],
  },
  {
    name: "Zoning_Area_4326",
    shortName: "za",
    newName: "ZoningArea",
    returnFields: [
      "geometry",
      "ZN_HOLDING",
      "GEN_ZONE",
      "FRONTAGE",
      "FSI_TOTAL",
      "ZN_AREA",
      "AREA_UNITS",
      "PRCNT_RES",
      "UNITS",
      "_id",
    ],
    queryValues: [
      { field: "ZN_HOLDING", value: "N", filterCondition: "=" },
      { field: "GEN_ZONE", value: null, filterCondition: "IN" }, // add  202, 6 zones for mixed-use buildings
      { field: "FRONTAGE", value: null, filterCondition: ">=" },
      { field: "FSI_TOTAL", value: null, filterCondition: null }, // data set shows some with FSI_TOTAL = -1
      { field: "ZN_AREA", value: null, filterCondition: ">=" },
      { field: "UNITS", value: null, filterCondition: ">=" }, // not sure if you want more or less units
      { field: "AREA_UNITS", value: null, filterCondition: null },
      { field: "PRCNT_RES", value: null, filterCondition: null },
    ],
  },
];

export const overlayData = [...queryOverlayData, ...filterOverlayData];

export const returnFields = overlayData.flatMap((overlay) => [
  ...overlay.returnFields,
]);
