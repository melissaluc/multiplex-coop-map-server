- Data files are stored on Hugging Face and queried in memory with DuckDB

# Methodology

-

## Potential Overlapping Columns

| Concept                        | Dataset(s)                      | Field(s)                         | Notes                                       | Units          |
| ------------------------------ | ------------------------------- | -------------------------------- | ------------------------------------------- | -------------- |
| Height / Stories               | ZoningHeightOverlay             | HT_STORIES, HT_STRING            | Stories and height                          | [], metres     |
| Coverage                       | ZoningByLaws, ZoningLotCoverage | COVERAGE, PRCNT_CVER, PRCNT_COMM | Lot coverage %                              | %              |
| Density / FSI                  | ZoningByLaws                    | DENSITY, FSI_TOTAL               | Floor space indices permits the max Density |                |
| Zone Type/Label                | Multiple                        | GEN_ZONE                         | Zone category and labels                    |                |
| Frontage                       | ZoningByLaws,                   | FRONTAGE                         | Lot dimensions                              | metres         |
| Minimum Total Lot Area         | ZoningByLaws,                   | ZN_AREA                          | Lot dimensions                              | sq-metres      |
| Lot Area                       | PropertyBoundaries              | STATEDAREA                       | Lot dimensions                              | sq-metres      |
| Minimum Area Per Dwelling Unit | ZoningByLaws,                   | AREA_UNITS                       | Lot dimensions                              | sq-metres/unit |

UserInputs

- Site Parking [Y,N, default=N]: ignore parking overlay if N, return ZN_PARKZONE if Y
- Number of Units [e.g. 1,4,5] (optional): if left blank, estimate units based on LotArea\*FSI/MinDwellUnitArea
- Area (required)
  - Lot Area (optional)
  - Building Footprint Area (optional)
  - Lot Coverage % (optional)
- Zone Type [0, 101, 202, 6, All]
- Height or Stories
- Density or total FSI
- Frontage
- Minimum Dwelling Area Unit (optional)

STATEDAREA >= ZN_AREA
maxUnits = STATEDAREA / AREA_UNIT
maxGrossFloorArea = FSI_TOTAL _ STATEDAREA
maxBuildingFootprint = STATEDAREA _ (COVERAGE / 100)

Filter on:

- GEN_ZONE IN (0, 101, 202, 6)
- HT_STORIES: stories (1,2,3,4,5,6)
  - if user provides height then userInput.height <= HT_LABEL
  - if user provides stories then userInput.stories <= HT_STORIES <= 6
- FEATURE_TYPE = "COMMON"

Report to User:
// Zoning Area

- ZN_HOLDING
- ZBL_CHAPTR
- ZBL_SECTN
- ABL_EXCPTN
- DENSITY
- ZN_EXCPTN
- ZN_STATUS
- ZN_ZONE

// Zoning Height Overlay

- HT_LABEL
- HT_STORIES

// Zoning Building Setback Overlay

- BYLAW_SECTIONLINK
- geometry

// Parking Zone Overlay

- ZN_PARKZONE

// Zoning Policy Road Overlay

- ROAD_NAME

// Zoning Policy Area Overlay

- POLICY_ID
- CHAPT_200

// Property Boundaries

- STATEDAREA
- PLAN_NAME
- PLAN_TYPE
- ADDRESS_NUMBER
- LINEAR_NAME_FULL
- geometry
- FEATURE_TYPE

// Calculated (future feature)

- Generate inlet rectangle representing the building footprint
- Total setbacks, developer can use to decide on orientation of the building based on total setbacks in each direction and allocate to front, rear, and sides
  - setback1
  - setback2
