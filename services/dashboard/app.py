import streamlit as st
import pandas as pd
import psycopg2
import plotly.express as px

# --- Database Connection ---
@st.cache_resource
def init_connection():
    return psycopg2.connect(
        host="localhost",
        port="5432",
        dbname="noise_db",
        user="noise_user",
        password="noise_password" # Ensure this matches your .env
    )

conn = init_connection()

@st.cache_data(ttl=60) # Cache data for 60 seconds to reduce DB load
def fetch_raw_data():
    query = "SELECT ts, sensor_id, value_db, quality_flag FROM noise_measurements ORDER BY ts DESC LIMIT 1000;"
    return pd.read_sql(query, conn)

@st.cache_data(ttl=60)
def fetch_hourly_summary():
    query = "SELECT bucket as ts, sensor_id, avg_noise_db, max_noise_db FROM hourly_noise_summary ORDER BY bucket DESC;"
    return pd.read_sql(query, conn)

# --- App Layout & Sidebar ---
st.set_page_config(page_title="Malmö Noise Dashboard", layout="wide")
st.sidebar.title("Stakeholder Views")
role = st.sidebar.radio("Select Role:", 
                        ["Environmental Officer", "IT Infrastructure", "Public/Decision-Makers"])

st.title(f"Malmö Noise Monitoring: {role} View")

# --- Role-Based Rendering ---
if role == "Environmental Officer":
    st.markdown("### Operational Monitoring & Investigation")
    df = fetch_raw_data()
    
    if not df.empty:
        # Create an interactive line chart using Plotly
        fig = px.line(df, x="ts", y="value_db", color="sensor_id", 
                      title="Real-time Noise Levels (Raw Data)",
                      labels={"ts": "Time", "value_db": "Noise Level (dB)"})
        st.plotly_chart(fig, use_container_width=True)
        
        st.markdown("#### Recent Observations")
        st.dataframe(df.head(10))
    else:
        st.warning("No data found in the database. Is the simulator running?")

elif role == "IT Infrastructure":
    st.markdown("### Pipeline Health & Sensor Status")
    st.info("System metrics, uptime, and data quality flags will be displayed here.")

elif role == "Public/Decision-Makers":
    st.markdown("### Verified Daily & Hourly Summaries")
    st.info("Aggregated, quality-controlled narratives and map overviews will be displayed here.")