import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// import { logout } from '@/services/authService';

export default function ProfileScreen() {
  const navigation = useNavigation();

  const handleLogout = async () => {
    // try {
    //   await logout();
    //   navigation.replace('Login'); // Redirect to Login screen
    // } catch (error) {
    //   Alert.alert('Logout Failed', 'Please try again');
    // }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Profile</Text>
      <Text style={styles.label}>Name:</Text>
      <Text style={styles.value}>Satya</Text>
      <Text style={styles.label}>Email:</Text>
      <Text style={styles.value}>Satya@gmail.com</Text>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 4,
  },
  value: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
