interface ColumnMeta {
  name: string;
  type?: string;
  description?: string;
  isGeometry?: boolean;
  isKey?: boolean;
  isUserQuery?: boolean;
  toRender?: boolean;
}

export interface Dataset {
  tableName: string;
  tableNameShort: string;
  name: string;
  columns?: ColumnMeta[];
}

export function getFilePath(name: string) {
  return `hf://datasets/ProjectMultiplexCoop/${name}/*.parquet`;
}

// Individual dataset variables
export const PropertyBoundaries: Dataset = {
  tableName: "property_boundaries",
  tableNameShort: "pb",
  name: "PropertyBoundaries",
  columns: [
    {
      name: "_id",
      type: "integer",
      description: "Unique row identifier for Open Data database",
    },
    {
      name: "PARCELID",
      type: "integer",
      isKey: true,
      description: "Unique ID of Parcel",
      toRender: true, // pick btwn PLANID or PLAN_NAME
    },
    {
      name: "FEATURE_TYPE",
      type: "string",
      description:
        "Condo - A closed boundary that represents the extent of ownership by a Condominium Corporation. Corridor - Describes a section of legal Right-of-Way. Reserve - A unit of land of varying width (usually 0.3 metres (1 foot) wide) used to restrict access to private/public properties, such as access to adjoining public highways. Common - A municipal parcel that is not designated as Corridor, Reserve or Condominium. A subdivision lot is a typical Common parcel.",
    },
    { name: "DATE_EFFECTIVE", type: "date", description: "System generated" },
    { name: "DATE_EXPIRY", type: "string", description: "System generated" },
    {
      name: "PLANID",
      type: "integer",
      description: "Internal unique ID of the plan",
      toRender: true,
    },
    {
      name: "PLAN_DESCRIPTION",
      type: "string",
      description: "Description from plan [if available]",
      toRender: true,
    },
    {
      name: "PLAN_NAME",
      type: "string",
      description: "Plan name [if available]",
      toRender: true,
    },
    {
      name: "PLAN_TYPE",
      type: "string",
      description: "Type of plan [if available]",
      toRender: true,
    },
    {
      name: "STATEDAREA",
      type: "string",
      description: "Area of parcel as stated by plan [if available]",
      toRender: true,
    },
    { name: "SOURCE_ID", type: "double", description: "Internal source ID" },
    {
      name: "ADDRESS_POINT_ID",
      type: "double",
      description: "Unique ID of the main address point related to the parcel",
    },
    {
      name: "ADDRESS_NUMBER",
      type: "string",
      description: "Address number",
      toRender: true,
    },
    {
      name: "LINEAR_NAME_ID",
      type: "double",
      description: "Unique ID of the street name",
    },
    {
      name: "LINEAR_NAME_FULL",
      type: "string",
      description: "Street name",
      toRender: true,
    },
    {
      name: "AROLL_SOURCE_DESC",
      type: "string",
      description: "Source of parcel info",
    },
    {
      name: "ADDRESS_ID",
      type: "double",
      description: "Unique ID of the address",
    },
    { name: "OBJECTID", type: "string", description: "System generated" },
    {
      name: "TRANS_ID_CREATE",
      type: "double",
      description: "System generated",
    },
    {
      name: "TRANS_ID_EXPIRE",
      type: "double",
      description: "System generated",
    },
    { name: "geometry", type: "geometry", isGeometry: true, toRender: true },
  ],
};

export const ZoningByLaws: Dataset = {
  tableName: "zoning_by_laws",
  tableNameShort: "zbl",
  name: "ZoningArea",
  columns: [
    { name: "_id", type: "integer" },
    {
      name: "GEN_ZONE",
      type: "integer",
      description:
        "The land use category of the lands within the zone boundary. Each 'zone category' has its own Chapter in the text of By-law 569-2013.",
      isUserQuery: true,
    },
    {
      name: "ZN_ZONE",
      type: "string",
      description:
        "The land use category of the lands within the zone boundary. Each 'zone category' has its own Chapter in the text of By-law 569-2013. [Zoned destination of the zone limited by GEN_ZONE. 0 = Residential, 1 = Open Space, 2 = Utility and Transportation, 4 = Employment Industrial, 5 = Institutional, 6 = Commercial Residential Employment, 101 = Residential Apartment, 201 = Commercial, 202 = Commercial Residential]",
    },
    {
      name: "ZN_HOLDING",
      type: "string",
      description:
        "To indicate whether there is a HOLDING status for the zone. The zone label will be prefaced by the letter (H). Yes (Y) or No (N)",
      isUserQuery: true,
    },
    {
      name: "HOLDING_ID",
      type: "double",
      description: "Holding Number if it exists.",
    },
    {
      name: "FRONTAGE",
      type: "double",
      description:
        "The required minimum Lot Frontage in the zone. Unit = metres.",
      isUserQuery: true,
    },
    {
      name: "ZN_AREA",
      type: "double",
      description:
        "The required minimum Lot Area in the zone. Unit = square metres.",
      isUserQuery: true,
    },
    {
      name: "UNITS",
      type: "double",
      description:
        "The permitted maximum number of Dwelling Units allowed on a lot in the zone.",
      isUserQuery: true,
    },
    {
      name: "DENSITY",
      type: "double",
      isUserQuery: true,
      description:
        "The permitted maximum Density in the zone by FSI (floor space index).",
    },
    {
      name: "COVERAGE",
      type: "integer",
      isUserQuery: true,
      description:
        "The permitted maximum percentage of a lot that can be covered by any part of any building or structure on or above the surface of the lot. Unit = % (percent)",
    },
    {
      name: "FSI_TOTAL",
      type: "double",
      isUserQuery: true,
      description:
        "The permitted maximum FSI (floor space index) Total in the zone.",
    },
    {
      name: "PRCNT_COMM",
      type: "double",
      description:
        "The permitted maximum FSI (floor space index) for Commercial Use in most mixed-use zones.",
    },
    {
      name: "PRCNT_RES",
      type: "double",
      description:
        "The permitted maximum FSI (floor space index) for Residential Use in most mixed-use zones.",
      isUserQuery: true,
    },
    {
      name: "PRCNT_EMMP",
      type: "double",
      description:
        "The permitted maximum FSI (floor space index) for Employment Uses in the zone.",
    },
    {
      name: "PRCNT_OFFC",
      type: "double",
      description:
        "The permitted maximum FSI (floor space index) for Office Uses in an Employment-Office zone.",
    },
    {
      name: "ZN_EXCPTN",
      type: "string",
      description:
        "This indicates whether a zone has an Exception. Yes (Y) or No (N)",
    },
    {
      name: "EXCPTN_NO",
      type: "double",
      description:
        "This is the Exception Number for the zone if one exists. The exception number is prefaced by the letter 'x' in the zone label.",
    },
    {
      name: "STAND_SET",
      type: "double",
      description:
        "Set of standards referred to in the Commercial-Residential mixed use zone, based on three different design typologies.",
    },
    {
      name: "ZN_STATUS",
      type: "integer",
      description:
        "Status of the Zone, primarily indicating whether the lands have been incorporated into By-law 569-2013 or not. 0-4 and 6 = In the By-law. 5 = Not Part of Zoning By-law 569-2013",
    },
    {
      name: "ZN_STRING",
      type: "string",
      description: "Complete label of the zone.",
    },
    {
      name: "AREA_UNITS",
      type: "double",
      description:
        "This is also a type of density limit, indicating the required minimum lot area per dwelling unit on a lot in the zone. Unit = square metres",
      isUserQuery: true,
    },
    {
      name: "ZBL_CHAPT",
      type: "string",
      description: "By-law text chapter number.",
    },
    {
      name: "ZBL_SECTN",
      type: "string",
      description: "By-law text section number.",
    },
    {
      name: "ZBL_EXCPTN",
      type: "string",
      description: "By-law text section number.",
    },
    { name: "geometry", type: "geometry", isGeometry: true },
  ],
};
// Only applicable if site parking is required
export const ParkingZoneOverlay: Dataset = {
  tableName: "parking_zone_overlay",
  tableNameShort: "pzo",
  name: "ParkingZoneOverlay",
  columns: [
    { name: "_id", type: "integer" },
    { name: "OBJECTID", type: "string" },
    { name: "ZN_PARKZONE", type: "string" },
    { name: "geometry", type: "geometry", isGeometry: true },
  ],
};

// Assuming a rectangular building footprint
export const ZoningBuildingSetback: Dataset = {
  tableName: "zoning_building_setback",
  tableNameShort: "zbs",
  name: "ZoningBuildingSetbackOverlay",
  columns: [
    { name: "_id", type: "integer" },
    { name: "OBJECTID", type: "string" },
    { name: "ZN_STRING", type: "string" },
    { name: "CH600_AREA_TYPE", type: "integer" },
    { name: "BYLAW_SECTIONLINK", type: "string" },
    { name: "geometry", type: "geometry", isGeometry: true },
  ],
};

export const ZoningLotCoverage: Dataset = {
  tableName: "zoning_lot_coverage",
  tableNameShort: "zlc",
  name: "ZoningLotCoverageOverlay",
  columns: [
    { name: "_id", type: "integer" },
    {
      name: "PRCNT_CVER",
      type: "double",
      isUserQuery: true,
      description:
        "The permitted maximum percentage of a lot that can be covered by any part of any building or structure on or above the surface of the lot. Unit = % (percent)",
    },
    { name: "geometry", type: "geometry", isGeometry: true },
  ],
};

export const ZoningHeightOverlay: Dataset = {
  tableName: "zoning_height_overlay",
  tableNameShort: "zho",
  name: "ZoningHeightOverlay",
  columns: [
    { name: "_id", type: "integer" },
    {
      name: "HT_STORIES",
      type: "double",
      isUserQuery: true,
      description:
        "The permitted maximum Height, in Storeys. A numeric value prefaced by the letters 'ST'. Unit = Storeys, Negative values = 0",
    },
    {
      name: "HT_STRING",
      type: "string",
      isUserQuery: true,
      description: "Height in metres and Storeys. Example: HT 10.5, ST 3",
    },
    { name: "HT_LABEL", type: "double" },
    { name: "geometry", type: "geometry", isGeometry: true },
  ],
};

export const ZoningPolicyAreaOverlay: Dataset = {
  tableName: "zoning_policy_area_overlay",
  tableNameShort: "zpao",
  name: "ZoningPolicyAreaOverlay",
  columns: [
    { name: "_id", type: "integer" },
    { name: "POLICY_ID", type: "string", description: "Policy Area" },
    {
      name: "CHAPT_200",
      type: "string",
      description: "Link to parking rate text",
    },
    {
      name: "EXCPTN_LK",
      type: "string",
      description: "Link to parking exception text",
    },
    { name: "geometry", type: "geometry", isGeometry: true },
  ],
};

// Not applicable to this project
export const ZoningPolicyRoadOverlay: Dataset = {
  tableName: "zoning_policy_road_overlay",
  tableNameShort: "zpro",
  name: "ZoningPolicyRoadOverlay",
  columns: [
    { name: "_id", type: "integer" },
    { name: "ROAD_NAME", type: "string" },
    { name: "geometry", type: "geometry", isGeometry: true },
  ],
};
// Not applicable to this project
export const ZoningQueenStWEatCommunityOverlay: Dataset = {
  tableName: "zoning_queen_st_w_eat_community_overlay",
  tableNameShort: "zqsweco",
  name: "ZoningQueenStWEatCommunityOverlay",
  columns: [
    { name: "_id", type: "integer" },
    { name: "OBJECTID", type: "string" },
    { name: "ZN_STRING", type: "string" },
    { name: "CH600_AREA_TYPE", type: "integer" },
    { name: "BYLAW_SECTIONLINK", type: "string" },
    { name: "geometry", type: "geometry", isGeometry: true },
  ],
};
// Not applicable to this project
export const ZoningRoomingHouseOverlay: Dataset = {
  tableName: "zoning_rooming_house_overlay",
  tableNameShort: "zrho",
  name: "ZoningRoomingHouseOverlay",
  columns: [
    { name: "_id", type: "integer" },
    { name: "RMH_AREA", type: "string", description: "Rooming House Area." },
    {
      name: "RMG_HS_NO",
      type: "integer",
      description: "Rooming House Number. A sub-set of a Rooming House Area.",
    },
    {
      name: "RMG_STRING",
      type: "string",
      description: "Rooming House Area + Number. Example: B1",
    },
    {
      name: "CHAP150_25",
      type: "string",
      description: "Link to Bylaw section. See interactive web map",
    },
    { name: "geometry", type: "geometry", isGeometry: true },
  ],
};

// Array of all datasets
export const datasets: Dataset[] = [
  PropertyBoundaries,
  ZoningByLaws,
  ParkingZoneOverlay,
  ZoningBuildingSetback,
  ZoningLotCoverage,
  ZoningHeightOverlay,
  ZoningPolicyAreaOverlay,
  ZoningPolicyRoadOverlay,
  ZoningQueenStWEatCommunityOverlay,
  ZoningRoomingHouseOverlay,
];
