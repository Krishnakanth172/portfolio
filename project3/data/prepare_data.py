import pandas as pd
from pathlib import Path


DATA_DIR = Path(__file__).parent

HEALTH_FILE = DATA_DIR / "health.csv"
ECONOMY_FILE = DATA_DIR / "economy-and-growth.csv"
OUTPUT_FILE = DATA_DIR / "worldbank_aging.csv"

START_YEAR = 1990
END_YEAR = 2020


GDP_COLUMN = (
    "average_value_GDP per capita, PPP "
    "(constant 2017 international $)"
)

AGING_COLUMN = (
    "average_value_Population ages 65 and above "
    "(% of total population)"
)

POPULATION_COLUMN = "average_value_Population, total"


# World Bank aggregate groups that are not individual countries.
AGGREGATE_CODES = {
    "AFE", "AFW", "ARB", "CEB", "CSS",
    "EAP", "EAR", "EAS", "ECA", "ECS",
    "EMU", "EUU", "FCS", "HIC", "HPC",
    "IBD", "IBT", "IDA", "IDB", "IDX",
    "LAC", "LCN", "LDC", "LIC", "LMC",
    "LMY", "LTE", "MEA", "MIC", "MNA",
    "NAC", "OED", "OSS", "PRE", "PSS",
    "PST", "SAS", "SSA", "SSF", "SST",
    "TEA", "TEC", "TLA", "TMN", "TSA",
    "TSS", "UMC", "WLD"
}


def main():
    print("Loading course World Bank datasets...")

    health = pd.read_csv(HEALTH_FILE)
    economy = pd.read_csv(ECONOMY_FILE)

    health = health[
        [
            "Country Name",
            "Country Code",
            "Year",
            AGING_COLUMN,
            POPULATION_COLUMN,
        ]
    ].copy()

    economy = economy[
        [
            "Country Name",
            "Country Code",
            "Year",
            GDP_COLUMN,
        ]
    ].copy()

    print("Merging health and economy data...")

    data = health.merge(
        economy,
        on=[
            "Country Name",
            "Country Code",
            "Year",
        ],
        how="inner",
    )

    data = data.rename(
        columns={
            "Country Name": "country",
            "Country Code": "country_code",
            "Year": "year",
            AGING_COLUMN: "age_65_plus_pct",
            POPULATION_COLUMN: "population",
            GDP_COLUMN: "gdp_per_capita",
        }
    )

    # Keep the project period.
    data = data[
        data["year"].between(
            START_YEAR,
            END_YEAR
        )
    ]

    # Remove World Bank regional/income aggregates.
    data = data[
        ~data["country_code"].isin(
            AGGREGATE_CODES
        )
    ]

    # Keep rows containing all variables needed
    # for the visualization.
    data = data.dropna(
        subset=[
            "gdp_per_capita",
            "age_65_plus_pct",
            "population",
        ]
    )

    data = data[
        (data["gdp_per_capita"] > 0)
        & (data["population"] > 0)
        & (data["age_65_plus_pct"] >= 0)
    ]

    data["gdp_per_capita"] = (
        data["gdp_per_capita"].round(2)
    )

    data["age_65_plus_pct"] = (
        data["age_65_plus_pct"].round(2)
    )

    data["population"] = (
        data["population"].round().astype(int)
    )

    data = data.sort_values(
        ["year", "country"]
    )

    data.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("\nDataset created successfully.")
    print(f"Rows: {len(data):,}")
    print(
        "Countries:",
        data["country_code"].nunique()
    )
    print(
        "Years:",
        f"{data['year'].min()}-{data['year'].max()}"
    )
    print(f"Saved to: {OUTPUT_FILE}")

    print("\nColumns:")
    print(data.columns.tolist())

    print("\nSample:")
    print(data.head().to_string(index=False))


if __name__ == "__main__":
    main()