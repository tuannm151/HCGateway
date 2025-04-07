import { StyleSheet, Text, View, TextInput, Button, Switch } from 'react-native';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  initialize,
  requestPermission,
  readRecords,
  readRecord
} from 'react-native-health-connect';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import {requestNotifications} from 'react-native-permissions';
import {Notifications} from 'react-native-notifications';

const setObj = async (key, value) => { try { const jsonValue = JSON.stringify(value); await AsyncStorage.setItem(key, jsonValue) } catch (e) { console.log(e) } }
const setPlain = async (key, value) => { try { await AsyncStorage.setItem(key, value) } catch (e) { console.log(e) } }
const get = async (key) => { try { const value = await AsyncStorage.getItem(key); if (value !== null) { try { return JSON.parse(value) } catch { return value } } } catch (e) { console.log(e) } }
const delkey = async (key, value) => { try { await AsyncStorage.removeItem(key) } catch (e) { console.log(e) } }
const getAll = async () => { try { const keys = await AsyncStorage.getAllKeys(); return keys } catch (error) { console.error(error) } }

Notifications.setNotificationChannel({
  channelId: 'push-errors',
  name: 'Push Errors',
  importance: 5,
  description: 'Alerts for push errors',
  groupId: 'push-errors',
  groupName: 'Errors',
  enableLights: true,
  enableVibration: true,
  showBadge: true,
  vibrationPattern: [200, 1000, 500, 1000, 500],
})

ReactNativeForegroundService.register();

let login;
let apiBase = 'https://api.hcgateway.shuchir.dev';
let lastSync = null;
let taskDelay = 7200 * 1000; // 2 hours

Toast.show({
  type: 'info',
  text1: "Loading API Base URL...",
  autoHide: false
})
get('apiBase')
.then(res => {
  if (res) {
    apiBase = res;
    Toast.hide();
    Toast.show({
      type: "success",
      text1: "API Base URL loaded",
    })
  }
  else {
    Toast.hide();
    Toast.show({
      type: "error",
      text1: "API Base URL not found. Using default server.",
    })
  }
})

get('login')
.then(res => {
  if (res) {
    login = res;
  }
})

get('lastSync')
.then(res => {
  if (res) {
    lastSync = res;
  }
})


const askForPermissions = async () => {
  await initialize();

  const grantedPermissions = await requestPermission([
    { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    { accessType: 'read', recordType: 'BasalBodyTemperature' },
    { accessType: 'read', recordType: 'BloodGlucose' },
    { accessType: 'read', recordType: 'BloodPressure' },
    { accessType: 'read', recordType: 'BasalMetabolicRate' },
    { accessType: 'read', recordType: 'BodyFat' },
    { accessType: 'read', recordType: 'BodyTemperature' },
    { accessType: 'read', recordType: 'BoneMass' },
    { accessType: 'read', recordType: 'CyclingPedalingCadence' },
    { accessType: 'read', recordType: 'CervicalMucus' },
    { accessType: 'read', recordType: 'ExerciseSession' },
    { accessType: 'read', recordType: 'Distance' },
    { accessType: 'read', recordType: 'ElevationGained' },
    { accessType: 'read', recordType: 'FloorsClimbed' },
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'Height' },
    { accessType: 'read', recordType: 'Hydration' },
    { accessType: 'read', recordType: 'LeanBodyMass' },
    { accessType: 'read', recordType: 'MenstruationFlow' },
    { accessType: 'read', recordType: 'MenstruationPeriod' },
    { accessType: 'read', recordType: 'Nutrition' },
    { accessType: 'read', recordType: 'OvulationTest' },
    { accessType: 'read', recordType: 'OxygenSaturation' },
    { accessType: 'read', recordType: 'Power' },
    { accessType: 'read', recordType: 'RespiratoryRate' },
    { accessType: 'read', recordType: 'RestingHeartRate' },
    { accessType: 'read', recordType: 'SleepSession' },
    { accessType: 'read', recordType: 'Speed' },
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'StepsCadence' },
    { accessType: 'read', recordType: 'TotalCaloriesBurned' },
    { accessType: 'read', recordType: 'Vo2Max' },
    { accessType: 'read', recordType: 'Weight' },
    { accessType: 'read', recordType: 'WheelchairPushes' },
    { accessType: 'write', recordType: 'ActiveCaloriesBurned' },
    { accessType: 'write', recordType: 'BasalBodyTemperature' },
    { accessType: 'write', recordType: 'BloodGlucose' },
    { accessType: 'write', recordType: 'BloodPressure' },
    { accessType: 'write', recordType: 'BasalMetabolicRate' },
    { accessType: 'write', recordType: 'BodyFat' },
    { accessType: 'write', recordType: 'BodyTemperature' },
    { accessType: 'write', recordType: 'BoneMass' },
    { accessType: 'write', recordType: 'CyclingPedalingCadence' },
    { accessType: 'write', recordType: 'CervicalMucus' },
    { accessType: 'write', recordType: 'ExerciseSession' },
    { accessType: 'write', recordType: 'Distance' },
    { accessType: 'write', recordType: 'ElevationGained' },
    { accessType: 'write', recordType: 'FloorsClimbed' },
    { accessType: 'write', recordType: 'HeartRate' },
    { accessType: 'write', recordType: 'Height' },
    { accessType: 'write', recordType: 'Hydration' },
    { accessType: 'write', recordType: 'LeanBodyMass' },
    { accessType: 'write', recordType: 'MenstruationFlow' },
    { accessType: 'write', recordType: 'MenstruationPeriod' },
    { accessType: 'write', recordType: 'Nutrition' },
    { accessType: 'write', recordType: 'OvulationTest' },
    { accessType: 'write', recordType: 'OxygenSaturation' },
    { accessType: 'write', recordType: 'Power' },
    { accessType: 'write', recordType: 'RespiratoryRate' },
    { accessType: 'write', recordType: 'RestingHeartRate' },
    { accessType: 'write', recordType: 'SleepSession' },
    { accessType: 'write', recordType: 'Speed' },
    { accessType: 'write', recordType: 'Steps' },
    { accessType: 'write', recordType: 'StepsCadence' },
    { accessType: 'write', recordType: 'TotalCaloriesBurned' },
    { accessType: 'write', recordType: 'Vo2Max' },
    { accessType: 'write', recordType: 'Weight' },
    { accessType: 'write', recordType: 'WheelchairPushes' },
  ]);

  if (grantedPermissions.length < 68) {
    Toast.show({
      type: 'error',
      text1: "Permissions not granted",
      text2: "Please visit settings to grant all permissions."
    })
  }
};

const sync = async () => {
  await initialize();
  console.log("Syncing data...");
  let numRecords = 0;
  let numRecordsSynced = 0;
  let failedRecords = [];

  Toast.show({
    type: 'info',
    text1: "Syncing data...",
  });

  await setPlain('lastSync', new Date().toISOString());
  lastSync = new Date().toISOString();

  const recordTypes = ["ActiveCaloriesBurned", "BasalBodyTemperature", "BloodGlucose", "BloodPressure", "BasalMetabolicRate", "BodyFat", "BodyTemperature", "BoneMass", "CyclingPedalingCadence", "CervicalMucus", "ExerciseSession", "Distance", "ElevationGained", "FloorsClimbed", "HeartRate", "Height", "Hydration", "LeanBodyMass", "MenstruationFlow", "MenstruationPeriod", "Nutrition", "OvulationTest", "OxygenSaturation", "Power", "RespiratoryRate", "RestingHeartRate", "SleepSession", "Speed", "Steps", "StepsCadence", "TotalCaloriesBurned", "Vo2Max", "Weight", "WheelchairPushes"];

  const updateProgress = () => {
    try {
      ReactNativeForegroundService.update({
        id: 1244,
        title: 'HCGateway Sync Progress',
        message: `HCGateway is currently syncing... [${numRecordsSynced}/${numRecords}]`,
        icon: 'ic_launcher',
        setOnlyAlertOnce: true,
        color: '#000000',
        progress: {
          max: numRecords,
          curr: numRecordsSynced,
        }
      });
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const syncBatch = async (records, recordType) => {
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      try {
        if (['SleepSession', 'Speed', 'HeartRate'].includes(recordType)) {
          await Promise.all(batch.map(async (record) => {
            try {
              const detailedRecord = await readRecord(recordType, record.metadata.id);
              await axios.post(`${apiBase}/api/v2/sync/${recordType}`, {
                data: detailedRecord
              }, {
                headers: {
                  "Authorization": `Bearer ${login}`
                }
              });
              numRecordsSynced++;
              updateProgress();
            } catch (err) {
              console.error(`Error syncing ${recordType}:`, err);
              failedRecords.push({ type: recordType, id: record.metadata.id, error: err.message });
            }
          }));
        } else {
          await axios.post(`${apiBase}/api/v2/sync/${recordType}`, {
            data: batch
          }, {
            headers: {
              "Authorization": `Bearer ${login}`
            }
          });
          numRecordsSynced += batch.length;
          updateProgress();
        }
      } catch (err) {
        console.error(`Error syncing batch of ${recordType}:`, err);
        failedRecords.push(...batch.map(record => ({
          type: recordType,
          id: record.metadata.id,
          error: err.message
        })));
      }
    }
  };

  for (const recordType of recordTypes) {
    try {
      const response = await readRecords(recordType, {
        timeRangeFilter: {
          operator: "between",
          startTime: String(new Date(new Date().setDate(new Date().getDate() - 29)).toISOString()),
          endTime: String(new Date().toISOString())
        }
      });

      const records = response.records;
      numRecords += records.length;
      await syncBatch(records, recordType);
    } catch (err) {
      console.error(`Error reading ${recordType}:`, err);
      continue;
    }
  }

  if (failedRecords.length > 0) {
    console.log('Failed records:', failedRecords);
    Toast.show({
      type: 'warning',
      text1: "Sync completed with errors",
      text2: `${failedRecords.length} records failed to sync`
    });
  } else {
    Toast.show({
      type: 'success',
      text1: "Sync completed successfully",
      text2: `${numRecordsSynced} records synced`
    });
  }

  ReactNativeForegroundService.update({
    id: 1244,
    title: 'HCGateway Sync Progress',
    message: `HCGateway is working in the background to sync your data.`,
    icon: 'ic_launcher',
    setOnlyAlertOnce: true,
    color: '#000000',
  });
}
}

export default function App() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [form, setForm] = React.useState(null);

  const loginFunc = async () => {
    Toast.show({
      type: 'info',
      text1: "Logging in...",
      autoHide: false
    })

    try {
    let response = await axios.post(`${apiBase}/api/v2/login`, form);
    if ('token' in response.data) {
      console.log(response.data);
      await setPlain('login', response.data.token);
      login = response.data.token;
      await setPlain('refreshToken', response.data.refresh);
      forceUpdate();
      Toast.hide();
      Toast.show({
        type: 'success',
        text1: "Logged in successfully",
      })
      askForPermissions();
    }
    else {
      Toast.hide();
      Toast.show({
        type: 'error',
        text1: "Login failed",
        text2: response.data.error
      })
    }
    }

    catch (err) {
      Toast.hide();
      Toast.show({
        type: 'error',
        text1: "Login failed",
        text2: err.message
      })
    }
  }

  React.useEffect(() => {
    requestNotifications(['alert']).then(({status, settings}) => {
      console.log(status, settings)
    });

    get('login')
    .then(res => {
      if (res) {
        login = res;
        get('taskDelay')
        .then(res => {
          if (res) taskDelay = Number(res);
        })

        ReactNativeForegroundService.add_task(() => sync(), {
          delay: taskDelay,
          onLoop: true,
          taskId: 'hcgateway_sync',
          onError: e => console.log(`Error logging:`, e),
        });

        ReactNativeForegroundService.start({
          id: 1244,
          title: 'HCGateway Sync Service',
          message: 'HCGateway is working in the background to sync your data.',
          icon: 'ic_launcher',
          setOnlyAlertOnce: true,
          color: '#000000',
        }).then(() => console.log('Foreground service started'));

        forceUpdate()
      }
    })
  }, [login])

  return (
    <View style={styles.container}>
      {login &&
        <View>
          <Text style={{ fontSize: 20, marginVertical: 10 }}>You are currently logged in.</Text>
          <Text style={{ fontSize: 17, marginVertical: 10 }}>Last Sync: {lastSync}</Text>

          <Text style={{ marginTop: 10, fontSize: 15 }}>API Base URL:</Text>
          <TextInput
            style={styles.input}
            placeholder="API Base URL"
            defaultValue={apiBase}
            onChangeText={text => {
              apiBase = text;
              setPlain('apiBase', text);
            }}
          />

          <Text style={{ marginTop: 10, fontSize: 15 }}>Sync Interval (in seconds) (defualt is 2 hours):</Text>
          <TextInput
            style={styles.input}
            placeholder="Sync Interval"
            keyboardType='numeric'
            defaultValue={(taskDelay / 1000).toString()}
            onChangeText={text => {
              taskDelay = Number(text) * 1000;
              setPlain('taskDelay', String(text * 1000));
              ReactNativeForegroundService.update_task(() => sync(), {
                delay: taskDelay,
              })
              Toast.show({
                type: 'success',
                text1: "Sync interval updated",
              })
            }}
          />
          <View style={{ marginTop: 20 }}>
            <Button
              title="Sync Now"
              onPress={() => {
                sync()
              }}
            />
          </View>

          <View style={{ marginTop: 20 }}>
            <Button
              title="Logout"
              onPress={() => {
                delkey('login');
                login = null;
                Toast.show({
                  type: 'success',
                  text1: "Logged out successfully",
                })
                forceUpdate();
              }}
              color={'darkred'}
            />
          </View>
        </View>
      }
      {!login &&
        <View>
          <Text style={{ 
            fontSize: 30,
            fontWeight: 'bold',
            textAlign: 'center',
           }}>Login</Text>

           <Text style={{ marginVertical: 10 }}>If you don't have an account, one will be made for you when logging in.</Text>

          <TextInput
            style={styles.input}
            placeholder="Username"
            onChangeText={text => setForm({ ...form, username: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry={true}
            onChangeText={text => setForm({ ...form, password: text })}
          />
          <Text style={{ marginVertical: 10 }}>API Base URL:</Text>
          <TextInput
            style={styles.input}
            placeholder="API Base URL"
            defaultValue={apiBase}
            onChangeText={text => {
              apiBase = text;
              setPlain('apiBase', text);
            }}
          />

          <Button
            title="Login"
            onPress={() => {
              loginFunc()
            }}
          />
        </View>
      }

    <StatusBar style="dark" />
    <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    textAlign: "center",
    padding: 50
  },

  input: {
    height: 50,
    marginVertical: 7,
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    width: 350,
    fontSize: 17
  },

});
