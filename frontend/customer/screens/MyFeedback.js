import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../shared/api/axiosConfig';

const buildUploadUri = (uploadPath) => {
  if (!uploadPath) {
    return null;
  }

  const serverBaseUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
  return `${serverBaseUrl}${uploadPath}`;
};

const MyFeedback = () => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('complaint');
  const [imageAsset, setImageAsset] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchMyFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/feedback/my');
      setFeedbackList(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyFeedback();
  }, [fetchMyFeedback]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyFeedback();
    setRefreshing(false);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo permission is required to attach an image');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setImageAsset(result.assets[0]);
  };

  const removeImage = () => setImageAsset(null);

  const submitFeedback = async () => {
    if (!message.trim()) {
      setError('Message is compulsory');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('comment', message.trim());

      if (imageAsset) {
        const extension = (imageAsset.fileName || imageAsset.uri || '').match(/\.[a-zA-Z0-9]+$/)?.[0] || '.jpg';
        const imageName = `feedback-${Date.now()}${extension}`;

        if (Platform.OS === 'web') {
          if (imageAsset.file) {
            formData.append('image', imageAsset.file, imageName);
          } else {
            const response = await fetch(imageAsset.uri);
            const blob = await response.blob();
            formData.append('image', blob, imageName);
          }
        } else {
          formData.append('image', {
            uri: imageAsset.uri,
            name: imageName,
            type: imageAsset.mimeType || 'image/jpeg',
          });
        }
      }

      const headers = Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' };
      await api.post('/feedback', formData, { headers });

      setMessage('');
      setImageAsset(null);
      setError('');
      await fetchMyFeedback();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFeedback = ({ item }) => (
    <View style={styles.feedbackCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.feedbackId}>{item.feedbackId || 'Feedback'}</Text>
        <View style={[styles.statusBadge, item.status === 'resolved' ? styles.resolved : styles.pending]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.feedbackMessage}>{item.comment}</Text>

      {item.imageUrl ? (
        <Image source={{ uri: buildUploadUri(item.imageUrl) }} style={styles.feedbackImage} />
      ) : null}

      <View style={styles.replySection}>
        <Text style={styles.replyLabel}>Manager Reply</Text>
        <Text style={styles.replyValue}>{item.reply || 'No reply yet'}</Text>
      </View>

      <Text style={styles.feedbackDate}>{new Date(item.createdAt).toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Feedback</Text>

      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Feedback Type</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeButton, type === 'complaint' && styles.typeButtonActive]}
            onPress={() => setType('complaint')}
          >
            <Text style={[styles.typeText, type === 'complaint' && styles.typeTextActive]}>Complaint</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, type === 'review' && styles.typeButtonActive]}
            onPress={() => setType('review')}
          >
            <Text style={[styles.typeText, type === 'review' && styles.typeTextActive]}>Review</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.formLabel}>Message *</Text>
        <TextInput
          style={styles.messageInput}
          placeholder="Write your feedback message"
          value={message}
          onChangeText={setMessage}
          multiline
        />

        <View style={styles.rowBetween}>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Text style={styles.imageButtonText}>{imageAsset ? 'Change Photo' : 'Add Photo (Optional)'}</Text>
          </TouchableOpacity>
          {imageAsset ? (
            <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {imageAsset ? <Image source={{ uri: imageAsset.uri }} style={styles.previewImage} /> : null}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity style={[styles.submitButton, submitting && styles.disabledButton]} onPress={submitFeedback} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Feedback'}</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#1abc9c" style={styles.loader} />
      ) : (
        <FlatList
          data={feedbackList}
          renderItem={renderFeedback}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No feedback submitted yet</Text>}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 12,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1abc9c',
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  formLabel: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 6,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeButton: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#1abc9c',
    borderColor: '#1abc9c',
  },
  typeText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  typeTextActive: {
    color: '#fff',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    minHeight: 95,
    textAlignVertical: 'top',
    padding: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageButton: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  removeButton: {
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  previewImage: {
    width: '100%',
    height: 160,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  errorText: {
    color: '#dc2626',
    marginTop: 8,
    fontSize: 13,
  },
  submitButton: {
    marginTop: 10,
    backgroundColor: '#1abc9c',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loader: {
    marginTop: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
  },
  feedbackId: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  pending: {
    backgroundColor: '#f59e0b',
  },
  resolved: {
    backgroundColor: '#16a34a',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  feedbackMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#1e293b',
  },
  feedbackImage: {
    marginTop: 8,
    width: '100%',
    height: 170,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  replySection: {
    marginTop: 10,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
  },
  replyLabel: {
    color: '#14532d',
    fontWeight: '700',
    marginBottom: 3,
    fontSize: 12,
  },
  replyValue: {
    color: '#14532d',
    fontSize: 13,
  },
  feedbackDate: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 11,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 20,
  },
});

export default MyFeedback;
