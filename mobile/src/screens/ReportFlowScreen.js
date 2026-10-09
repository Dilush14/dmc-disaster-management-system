import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { Button, Card, Field, Header, Screen } from '../components/UI';
import { enqueueHazardReport, syncPendingHazardReports } from '../services/offlineReports';
import { hazards } from '../data/catalog';
import { colors } from '../theme';

function createClientRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export default function ReportFlowScreen() {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState({ hazardType: '', description: '', latitude: '', longitude: '', dateTime: new Date().toISOString(), photo: null });
  const [busy, setBusy] = useState(false);
  const set = key => value => setValues(current => ({ ...current, [key]: value }));
  const canContinue = useMemo(() => step === 1 ? Boolean(values.hazardType) : step === 2 ? values.description.trim().length >= 10 : Boolean(values.latitude && values.longitude), [step, values]);
  async function preparePhoto(asset) {
    const longestSide = Math.max(asset.width || 0, asset.height || 0);
    const actions = longestSide > 1600 ? [{ resize: longestSide === asset.width ? { width: 1600 } : { height: 1600 } }] : [];
    const compressed = await manipulateAsync(asset.uri, actions, {
      compress: 0.65,
      format: SaveFormat.JPEG,
    });
    return { ...asset, ...compressed, mimeType: 'image/jpeg', fileName: 'hazard-photo.jpg' };
  }
  async function locate() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return Alert.alert('Location permission needed', 'Allow location access or enter the coordinates manually.');
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setValues(current => ({ ...current, latitude: location.coords.latitude.toFixed(6), longitude: location.coords.longitude.toFixed(6) }));
  }
  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (!result.canceled) {
      try {
        const photo = await preparePhoto(result.assets[0]);
        setValues(current => ({ ...current, photo }));
      } catch {
        Alert.alert('Photo unavailable', 'Choose a different JPEG or PNG image.');
      }
    }
  }
  async function camera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') return Alert.alert('Camera permission needed', 'Allow camera access to take evidence photos.');
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (!result.canceled) {
      try {
        const photo = await preparePhoto(result.assets[0]);
        setValues(current => ({ ...current, photo }));
      } catch {
        Alert.alert('Photo unavailable', 'Choose a different JPEG or PNG image.');
      }
    }
  }
  async function submit() {
    setBusy(true);
    try {
      const queued = await enqueueHazardReport({ ...values, clientRequestId: createClientRequestId() });
      const sync = await syncPendingHazardReports();
      const submitted = sync.submitted.find(item => item.clientRequestId === queued.clientRequestId);
      if (submitted) setStep(5);
      else Alert.alert('Saved offline', 'Your report is safely stored on this device and will be submitted automatically when the connection returns.');
    }
    catch (error) { Alert.alert('Could not save report', error.message); }
    finally { setBusy(false); }
  }
  if (step === 5) return <Screen><View style={{ flex: 1, justifyContent: 'center' }}><Text style={{ fontSize: 30, fontWeight: '800', color: colors.success }}>Report submitted</Text><Text style={{ color: colors.muted, marginTop: 12, lineHeight: 22 }}>Thank you for helping DMC identify hazards. Your report is now pending verification.</Text><Button title="Submit another report" onPress={() => { setValues({ hazardType: '', description: '', latitude: '', longitude: '', dateTime: new Date().toISOString(), photo: null }); setStep(1); }} /></View></Screen>;
  return <Screen><Header title="Report a hazard" subtitle={`Step ${step} of 4`} />{step === 1 && <><Text style={{ fontSize: 17, fontWeight: '800', marginBottom: 12 }}>What happened?</Text>{hazards.map(([value, label, description]) => <Pressable key={value} onPress={() => set('hazardType')(value)} style={{ padding: 15, borderRadius: 14, borderWidth: 2, borderColor: values.hazardType === value ? colors.primary : colors.border, backgroundColor: values.hazardType === value ? colors.primaryLight : colors.surface, marginBottom: 10 }}><Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{label}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{description}</Text></Pressable>)}</>}{step === 2 && <Field label="Describe the hazard" value={values.description} onChangeText={set('description')} multiline placeholder="What did you see? Include useful details for the response team." />}{step === 3 && <><Button title="Use my current location" onPress={locate} /><Text style={{ textAlign: 'center', marginVertical: 14, color: colors.muted }}>or enter coordinates</Text><Field label="Latitude" value={values.latitude} onChangeText={set('latitude')} keyboardType="numbers-and-punctuation" placeholder="7.8731" /><Field label="Longitude" value={values.longitude} onChangeText={set('longitude')} keyboardType="numbers-and-punctuation" placeholder="80.7718" /></>}{step === 4 && <><Text style={{ color: colors.muted, marginBottom: 12 }}>A clear photo helps officers verify your report. You can continue without one.</Text><Button title="Take a photo" onPress={camera} /><Button title="Choose from gallery" secondary onPress={pickPhoto} />{values.photo ? <Card><Image source={{ uri: values.photo.uri }} style={{ height: 180, borderRadius: 12 }} /><Text style={{ color: colors.success, marginTop: 8, fontWeight: '700' }}>Photo attached</Text></Card> : null}<Card><Text style={{ fontWeight: '800' }}>Review</Text><Text style={{ color: colors.muted, marginTop: 5 }}>{hazards.find(item => item[0] === values.hazardType)?.[1]} at {values.latitude}, {values.longitude}</Text><Text style={{ color: colors.muted, marginTop: 5 }}>{values.description}</Text></Card></>}{step < 4 ? <Button title="Continue" onPress={() => setStep(step + 1)} disabled={!canContinue} /> : <Button title={busy ? 'Submitting...' : 'Submit report'} onPress={submit} disabled={busy} />}{step > 1 && <Button title="Back" secondary onPress={() => setStep(step - 1)} />}</Screen>;
}
