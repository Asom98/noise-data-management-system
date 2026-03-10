# Noise Pollution Data Management System
A time-series data pipeline and dashboard for municipal environmental monitoring.

## Overview

This project implements a data management system for environmental sensor data,
with an initial focus on **noise pollution monitoring** in collaboration with
**Malmö Stad**. The system ingests measurements from IoT sensors, stores them in
a scalable time-series database, and provides infrastructure for analysis and
visualization through dashboards.

The system is designed as part of a **Design Science Research (DSR)** thesis
project at **Malmö University**.

### Project Goals

The system aims to:

- Ingest environmental sensor measurements from an MQTT-based IoT platform.
- Store time-series observations in a scalable database.
- Support aggregation and analysis of live and historical sensor data.
- Provide dashboards adapted to different stakeholders:
  - Environmental officers
  - IT infrastructure staff
  - Decision-makers and policymakers
  - Public users

Environmental noise is recognized as a significant environmental health risk,
and efficient monitoring infrastructure is necessary for data-driven decision
making in cities.

---

## System Architecture

The system follows a modular architecture composed of several components.

IoT Sensors
│
▼
MQTT Broker (IoT Platform)
│
▼
Ingestion Service
│
▼
TimescaleDB (Time-Series Storage)
│
▼
Aggregation / Analysis Layer
│
▼
Dashboards and Visualization



### Core Technologies

| Component | Technology |
|----------|------------|
| Messaging | MQTT |
| Database | TimescaleDB (PostgreSQL) |
| Containerization | Docker |
| Orchestration | Docker Compose |
| Dashboard | (planned) Web visualization stack |

The system is containerized to ensure reproducibility across operating systems.

---
