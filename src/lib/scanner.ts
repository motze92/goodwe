/* eslint-disable functional/prefer-readonly-type */
/* eslint-disable functional/no-this-expression */
/* eslint-disable functional/no-class */
import dgram from "dgram";

import arrayBufferToBuffer from "arraybuffer-to-buffer";
import hexToArray from "hex-to-array-buffer";

const PORT = 48899;

export default class Scanner {
  constructor(influx, bind_ip = '0.0.0.0') {
    this.influx = influx;
    this.bind_ip = bind_ip;
  }

  influx = null;
  bind_ip = '0.0.0.0'

  inverter_ip: string | null = null;

  async findInvertes() {
    const server = dgram.createSocket('udp4');
    const data = Buffer.from('WIFIKIT-214028-READ')

    server.bind(PORT, this.bind_ip, () => {
      server.setMulticastInterface(this.bind_ip)
    });

    return new Promise((resolve, reject) => {
      server.on('error', (error) => {
        console.log('Error1: ' + error);
        server.close();
        reject()
      });

      server.on('message', (msg) => {
        const res = msg.toString().split(',')
        if (res.length === 3) {
          this.inverter_ip = res[0]
          server.close();
          resolve({
            ip: res[0],
            serial: res[1],
            name: res[2]
          })
        }
      });

      server.on('listening', () => {
        console.log('Listening for inverter')
        server.send(data, PORT, '255.255.255.255')
      });
    })

  }

  readonly getData = async () => {
    if (!this.inverter_ip) {
      try {
        await this.findInvertes()
      } catch (error) {
        console.log('Inverter search: ' + error)
        await this.sleep(5000)
        this.getData()
      }
    }

    const server = dgram.createSocket('udp4');
    const data2 = hexToArray('aa55c07f0106000245');
    // emits when any error occurs
    server.on('error', (error) => {
      console.log('Error2: ' + error);
      server.close();
      // this.findInvertes()
    });

    // emits on new datagram msg
    server.on('message', (msg) => {
      if (msg.length === 149) {
        this.influx.writePoints([
          {
            measurement: 'photovoltaik',
            fields: {
              bat_percentage: this.readPercentage(msg, 35),
              bat_voltage: this.readVoltage(msg, 17),
              bat_temperature: this.readTemperature(msg, 23),
              inv_temperature: this.readTemperature(msg, 60),
              pv1_voltage: this.readVoltage(msg, 7),
              pv1_current: this.readCurrent(msg, 9),
              pv1_power: this.readVoltage(msg, 7) * this.readCurrent(msg, 9),
              pv2_voltage: this.readVoltage(msg, 12),
              pv2_current: this.readCurrent(msg, 14),
              pv2_power: this.readVoltage(msg, 12) * this.readCurrent(msg, 14),
              pv_total_power: this.readVoltage(msg, 7) * this.readCurrent(msg, 9) + this.readVoltage(msg, 12) * this.readCurrent(msg, 14),
              grid_voltage: this.readVoltage(msg, 41),
              grid_current: this.readCurrent(msg, 43),
              grid_power: this.readPower(msg, 45),
              grid_power2: this.readPower(msg, 54),
              grid_frequency: this.readFreq(msg, 47)
            },
          }
        ]).catch((err: { readonly stack: any; }) => {
          console.error(`Error saving data to InfluxDB! ${err.stack}`)
        })
      }
    });

    //emits when socket is ready and listening for datagram msgs
    server.on('listening', () => {
      setInterval(() => {
        server.send(arrayBufferToBuffer(data2), 8899, this.inverter_ip)
      }, 5000)
    });


    server.bind(8899, this.bind_ip, () => {
      server.setMulticastInterface(this.bind_ip)
    });
  }

  readPower(data, offset) {
    let val = data.slice(offset, offset + 4).readInt16BE()
    if (val > 32768) {
      val = val - 65535
    }
    return val
  }

  readPower2(data, offset) {
    let val = data.slice(offset, offset + 2).readInt16BE()
    if (val > 32768) {
      val = val - 65535
    }
    return val
  }

  readPowerK(data, offset) {
    const val = data.slice(offset, offset + 4).readInt16BE()
    return val / 10;
  }

  readPowerK2(data, offset) {
    const val = data.slice(offset, offset + 2).readInt16BE()
    return val / 10;
  }

  readFreq(data, offset) {
    const val = data.slice(offset, offset + 2).readInt16BE()
    return val / 100;
  }

  readTemperature(data, offset) {
    const val = data.slice(offset, offset + 2).readInt16BE()
    return val / 10;
  }

  readVoltage(data, offset) {
    const val = data.slice(offset, offset + 2).readInt16BE()
    return val / 10;
  }

  readCurrent(data, offset) {
    let val = data.slice(offset, offset + 2).readInt16BE()
    if (val > 32768) {
      val = val - 65535
    }
    return val / 10;
  }

  readPercentage(data, offset) {
    const val = data.slice(offset, offset + 1).readInt8()
    return val;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
