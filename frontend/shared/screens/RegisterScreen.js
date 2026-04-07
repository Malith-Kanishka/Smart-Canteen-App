import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../api/axiosConfig';

const isOldEnough = (dateOfBirth) => {
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 17;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (dateString) => {
  if (!dateString) {
    return new Date(2000, 0, 1);
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(2000, 0, 1);
  }

  return parsed;
};

const RegisterScreen = ({ navigation, onSignIn }) => {
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    nic: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: ''
  });
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = async () => {
    const { fullName, username, nic, email, phone, address, dateOfBirth, password, confirmPassword } = form;

    if (!fullName || !username || !nic || !email || !phone || !address || !dateOfBirth || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isOldEnough(dateOfBirth)) {
      setError('Age must be greater than 16');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        fullName: fullName.trim(),
        username: username.trim(),
        nic: nic.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        dateOfBirth,
        password
      });

      await onSignIn(response.data.token, response.data.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Customer Registration</Text>
      <Text style={styles.subtitle}>Create your account</Text>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={form.fullName}
          onChangeText={(value) => updateField('fullName', value)}
          editable={!loading}
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={form.username}
          onChangeText={(value) => updateField('username', value)}
          editable={!loading}
          placeholderTextColor="#999"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="NIC"
          value={form.nic}
          onChangeText={(value) => updateField('nic', value)}
          editable={!loading}
          placeholderTextColor="#999"
          autoCapitalize="characters"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={form.email}
          onChangeText={(value) => updateField('email', value)}
          editable={!loading}
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone (10 digits)"
          value={form.phone}
          onChangeText={(value) => updateField('phone', value)}
          editable={!loading}
          placeholderTextColor="#999"
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Address"
          value={form.address}
          onChangeText={(value) => updateField('address', value)}
          editable={!loading}
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowDobPicker(true)}
          disabled={loading}
        >
          <Text style={form.dateOfBirth ? styles.dateValue : styles.datePlaceholder}>
            {form.dateOfBirth || 'Select Date of Birth'}
          </Text>
        </TouchableOpacity>

        {showDobPicker && (
          <DateTimePicker
            value={parseDate(form.dateOfBirth)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(_event, selectedDate) => {
              setShowDobPicker(false);
              if (selectedDate) {
                updateField('dateOfBirth', formatDate(selectedDate));
              }
            }}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={form.password}
          onChangeText={(value) => updateField('password', value)}
          editable={!loading}
          placeholderTextColor="#999"
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={form.confirmPassword}
          onChangeText={(value) => updateField('confirmPassword', value)}
          editable={!loading}
          placeholderTextColor="#999"
          secureTextEntry
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.helperText}>A user ID like U001 will be created automatically after registration.</Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
          <Text style={styles.linkText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1abc9c'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#7f8c8d',
    marginTop: 6,
    marginBottom: 24
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 4
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    fontSize: 16
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff'
  },
  datePlaceholder: {
    color: '#999',
    fontSize: 16
  },
  dateValue: {
    color: '#111827',
    fontSize: 16
  },
  button: {
    backgroundColor: '#1abc9c',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 8
  },
  helperText: {
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 12
  },
  linkText: {
    color: '#1abc9c',
    textAlign: 'center',
    marginTop: 14,
    textDecorationLine: 'underline'
  }
});

export default RegisterScreen;
