import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ReportFlowScreen from '../screens/ReportFlowScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import ReportDetailsScreen from '../screens/ReportDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
function ReportsStack() {
  return <Stack.Navigator><Stack.Screen name="MyReports" component={MyReportsScreen} options={{ title: 'My reports' }} /><Stack.Screen name="ReportDetails" component={ReportDetailsScreen} options={{ title: 'Report details' }} /></Stack.Navigator>;
}
export default function AppNavigator() {
  return <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.primary, headerShown: false }}><Tab.Screen name="Home" component={HomeScreen} /><Tab.Screen name="Notifications" component={NotificationsScreen} /><Tab.Screen name="Report" component={ReportFlowScreen} options={{ title: 'Report hazard' }} /><Tab.Screen name="Reports" component={ReportsStack} options={{ title: 'My reports' }} /><Tab.Screen name="Profile" component={ProfileScreen} /></Tab.Navigator>;
}
