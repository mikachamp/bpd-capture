import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraMode } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { saveCapturedMedia } from '../services/storage';
import { addMediaItem } from '../db/mediaItems';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

export function CaptureScreen({ route, navigation }: Props) {
  const { orderId, ceNumber } = route.params;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mode, setMode] = useState<CameraMode>('picture');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const discardNextRecording = useRef(false);

  if (!cameraPermission || !microphonePermission) {
    return <SafeAreaView style={styles.container} />;
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionPrompt}>
          <Text style={styles.permissionText}>
            BPD Capture needs camera and microphone access to record job photos and videos.
          </Text>
          <Pressable
            style={styles.permissionButton}
            onPress={async () => {
              await requestCameraPermission();
              await requestMicrophonePermission();
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Access</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const persistCapture = async (uri: string, type: 'photo' | 'video') => {
    setIsSaving(true);
    try {
      const saved = await saveCapturedMedia(ceNumber, uri, type);
      await addMediaItem(orderId, type, saved.filePath, saved.fileName);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Save failed', 'Could not save this capture. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShutterPress = async () => {
    if (isSaving) return;

    if (mode === 'picture') {
      const photo = await cameraRef.current?.takePictureAsync();
      if (photo?.uri) {
        await persistCapture(photo.uri, 'photo');
      }
      return;
    }

    if (isRecording) {
      cameraRef.current?.stopRecording();
      return;
    }

    setIsRecording(true);
    const video = await cameraRef.current?.recordAsync();
    setIsRecording(false);

    if (discardNextRecording.current) {
      discardNextRecording.current = false;
      navigation.goBack();
      return;
    }

    if (video?.uri) {
      await persistCapture(video.uri, 'video');
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      discardNextRecording.current = true;
      cameraRef.current?.stopRecording();
      return;
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" mode={mode} />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable style={styles.cancelButton} onPress={handleCancel} hitSlop={12}>
            <Text style={styles.cancelButtonText}>{isRecording ? '■ Stop & Discard' : '✕ Cancel'}</Text>
          </Pressable>

          <View style={styles.modeSwitch}>
            <Pressable
              style={[styles.modeOption, mode === 'picture' && styles.modeOptionActive]}
              onPress={() => !isRecording && setMode('picture')}
            >
              <Text style={[styles.modeOptionText, mode === 'picture' && styles.modeOptionTextActive]}>Photo</Text>
            </Pressable>
            <Pressable
              style={[styles.modeOption, mode === 'video' && styles.modeOptionActive]}
              onPress={() => !isRecording && setMode('video')}
            >
              <Text style={[styles.modeOptionText, mode === 'video' && styles.modeOptionTextActive]}>Video</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.shutterRow}>
          <Pressable
            style={[styles.shutter, isRecording && styles.shutterRecording]}
            onPress={handleShutterPress}
            disabled={isSaving}
          >
            <View style={[styles.shutterInner, isRecording && styles.shutterInnerRecording]} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cancelButton: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modeSwitch: {
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  modeOption: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  modeOptionActive: {
    backgroundColor: '#fff',
  },
  modeOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  modeOptionTextActive: {
    color: '#000',
  },
  shutterRow: {
    alignItems: 'center',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRecording: {
    borderColor: '#E5484D',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  shutterInnerRecording: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E5484D',
  },
  permissionPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 15,
  },
  permissionButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#000',
    fontWeight: '600',
  },
});
