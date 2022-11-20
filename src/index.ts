export * from './lib/async';
export * from './lib/number';

import * as dotenv from 'dotenv';
import { FieldType, InfluxDB } from "influx";

import Scanner from './lib/scanner';


dotenv.config()

const scanner = new Scanner(new InfluxDB({
  host: 'influxdb',
  database: 'photovoltaik',
  schema: [
    {
      measurement: 'photovoltaik',
      fields: {
        bat_percentage: FieldType.INTEGER,
        bat_voltage: FieldType.FLOAT,
        bat_temperature: FieldType.FLOAT,
        inv_temperature: FieldType.FLOAT,
        pv1_voltage: FieldType.FLOAT,
        pv1_current: FieldType.FLOAT,
        pv1_power: FieldType.FLOAT,
        pv2_voltage: FieldType.FLOAT,
        pv2_current: FieldType.FLOAT,
        pv2_power: FieldType.FLOAT,
        pv_total_power: FieldType.FLOAT,
        grid_voltage: FieldType.FLOAT,
        grid_current: FieldType.FLOAT,
        grid_power: FieldType.FLOAT,
        grid_power2: FieldType.FLOAT,
        grid_frequency: FieldType.FLOAT
      },
      tags: [
        'host'
      ]
    }
  ]
}), '0.0.0.0')

scanner.getData()

