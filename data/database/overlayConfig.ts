const noParking = false;

export const overlayData = [
  {
    name: "Parking Zone Overlay - 4326",
    shortName: "pzo",
    newName: "ParkingZoneOverlay",
    returnFields: ["ZN_PARKZONE", "geometry"],
    skipDataset: noParking,
  },
  {
    name: "City Wards Data - 4326",
    shortName: "cwd",
    newName: "CityWardsData",
    returnFields: ["AREA_NAME", "AREA_SHORT_CODE", "geometry"],
  },
  {
    name: "Zoning Building Setback Overlay - 4326",
    shortName: "zbso",
    newName: "ZoningBuildingSetbackOverlay",
    returnFields: ["BYLAW_SECTIONLINK", "geometry"],
  },
  {
    name: "Zoning Height Overlay - 4326",
    shortName: "zho",
    newName: "ZoningHeightOverlay",
    returnFields: ["geometry", "HT_STORIES", "HT_LABEL"],
    queryValues: [
      {
        field: "HT_STORIES",
        value: 6,
        filterCondition: "<=",
      },
      {
        field: "HT_STORIES",
        value: 0,
        filterCondition: ">",
      },
      {
        field: "HT_LABEL",
        value: null,
        filterCondition: null,
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
    name: "Zoning Policy Area Overlay - 4326",
    shortName: "zpao",
    newName: "ZoningPolicyAreaOverlay",
    returnFields: ["POLICY_ID", "CHAPT_200", "geometry"],
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
    ],
    queryValues: [
      { field: "ZN_HOLDING", value: "N", filterCondition: "=" },
      { field: "GEN_ZONE", value: [0, 101], filterCondition: "IN" }, // add  202, 6 zones for mixed-use buildings
      { field: "FRONTAGE", value: 10, filterCondition: ">=" },
      { field: "FSI_TOTAL", value: null, filterCondition: null }, // data set shows some with FSI_TOTAL = -1
      { field: "ZN_AREA", value: 190, filterCondition: ">=" },
      { field: "UNITS", value: 6, filterCondition: "=" }, // not sure if you want more or less units
      { field: "AREA_UNITS", value: null, filterCondition: null },
      { field: "PRCNT_RES", value: null, filterCondition: null },
    ],
  },
];

export const returnFields = overlayData.flatMap((overlay) => [
  ...overlay.returnFields,
]);
