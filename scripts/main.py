import pandas as pd
import plotly.graph_objects as go
import json
from dash import Dash, dcc, html, Input, Output, State

df = pd.read_csv("data/retea-scolara-2024-2025.csv")

# visualize county level

df_county = df.groupby("Judet PJ").size().reset_index(name="num_schools")

county_map = {
    "AB": "Alba",
    "AR": "Arad",
    "AG": "Argeș",
    "BC": "Bacău",
    "BH": "Bihor",
    "BN": "Bistrița-Năsăud",
    "BR": "Brăila",
    "BT": "Botoșani",
    "BV": "Brașov",
    "BZ": "Buzău",
    "CS": "Caraș-Severin",
    "CL": "Călărași",
    "CJ": "Cluj",
    "CT": "Constanța",
    "CV": "Covasna",
    "DB": "Dâmbovița",
    "DJ": "Dolj",
    "GL": "Galați",
    "GR": "Giurgiu",
    "GJ": "Gorj",
    "HR": "Harghita",
    "HD": "Hunedoara",
    "IL": "Ialomița",
    "IS": "Iași",
    "IF": "Ilfov",
    "MM": "Maramureș",
    "MH": "Mehedinți",
    "MS": "Mureș",
    "NT": "Neamț",
    "OT": "Olt",
    "PH": "Prahova",
    "SM": "Satu Mare",
    "SJ": "Sălaj",
    "SB": "Sibiu",
    "SV": "Suceava",
    "TR": "Teleorman",
    "TM": "Timiș",
    "TL": "Tulcea",
    "VS": "Vaslui",
    "VL": "Vâlcea",
    "VN": "Vrancea",
    "B": "București",
}

# df_county['shapeISO'] = 'RO-' + df_county['Judet PJ']
df_county["county_name"] = df_county["Judet PJ"].map(county_map)

with open("data/ro_judete_poligon.geojson", "r") as f:
    geojson_ADM1 = json.load(f)


def adm1_map():
    return go.Figure(
        go.Choroplethmap(
            geojson=geojson_ADM1,
            locations=df_county["Judet PJ"],
            z=df_county["num_schools"],
            featureidkey="properties.mnemonic",
            colorscale="Blues",
            marker_opacity=0.8,
            marker_line_width=0.3,
            marker_line_color="white",
            colorbar=dict(
                title="Number of schools",
                orientation="h",
                x=0.5,
                xanchor="center",
                y=0,
                thickness=10,
                len=0.7,
            ),
            hovertemplate="<b>%{text}</b><br>Schools: %{z}<extra></extra>",
            text=df_county["county_name"],
        )
    ).update_layout(
        map=dict(
            style="white-bg",
            center={"lat": 45.85, "lon": 24.99},
            zoom=5.8,
            pitch=0,
            bearing=0,
        ),
        uirevision="lock",
        margin=dict(r=0, t=0, l=0, b=0),
    )


# --- Dash app ---
app = Dash(__name__)
app.title = "România Educată Dashboard"

app.layout = html.Div(
    [
        html.H1("România Educată"),
        html.P("Vizualizare interactivă a rețelei școlare din România"),
        dcc.Graph(
            id="map",
            figure=adm1_map(),
            config={
                "scrollZoom": False,
                "doubleClick": "reset",
                "displayModeBar": False,
            },
            style={"height": "85vh"},
        ),
    ],
    id="main-container",
)


app.run(debug=True)
