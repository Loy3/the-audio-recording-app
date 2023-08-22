import { StatusBar } from 'expo-status-bar';
// import React from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, TextInput, Image } from 'react-native';
import { Audio, RecordingOptionsPresets } from "expo-av";
// import { AudioRecorderPlayer, AudioPlayer } from 'react-native-audio-recorder-player';
import React, { useState, useEffect, useRef } from 'react';

import recordOn from "./assets/recorder.png";
import recordOff from "./assets/recorderOff.png";

// import { Audio } from 'expo-av';

export default function App() {

  // const [recording, setRecording] = useState(null);
  // const [isRecording, setIsRecording] = useState(false);
  // const [sound, setSound] = useState(null);
  // const [isPlaying, setIsPlaying] = useState(false);

  // const startRecording = async () => {
  //   try {
  //     const recording = new Audio.Recording();
  //     await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
  //     await recording.startAsync();
  //     setRecording(recording);
  //     setIsRecording(true);
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };

  // const stopRecording = async () => {
  //   try {
  //     await recording.stopAndUnloadAsync();
  //     setIsRecording(false);
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };

  // const playAudio = async () => {
  //   try {
  //     const { sound } = await Audio.Sound.createAsync({ uri: recording.getURI() });
  //     setSound(sound);
  //     await sound.playAsync();
  //     setIsPlaying(true);
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };

  // const stopAudio = async () => {
  //   try {
  //     await sound.unloadAsync();
  //     setIsPlaying(false);
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };

  // useEffect(() => {
  //   return sound
  //     ? () => {
  //         sound.unloadAsync();
  //       }
  //     : undefined;
  // }, [sound]);




  const [recording, setRecording] = useState();
  const [recordings, setRecordings] = useState([]);
  const [message, setMessage] = useState("");
  const [recordingTitle, setRecordingTitle] = useState("");

  const [count, setCount] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const intervalRef = useRef(null);

  const [recordStatus, setRecordStatus] = useState(recordOff);

  useEffect(() => {
    console.log("ine 77", recordingTitle);
  }, [recordingTitle])

  async function startRecording() {
    const permission = await Audio.requestPermissionsAsync();
    console.log(permission);

    try {
      if (permission.status === "granted") {
        await Audio.setAudioModeAsync({
          allowRecordingIOS: true,
          playInSilentModeIOS: true
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
        );
        setRecording(recording);

        setIsCounting(true);
        intervalRef.current = setInterval(() => {
          setCount((prevCount) => prevCount + 1);
        }, 1000);

        setRecordStatus(recordOn);
      } else {
        setMessage("Please grant permission to app to access microphone.")
      }
    } catch (error) {
      console.error("Failed to start recording", error);
    }
  }

  async function stopRecording() {
    setRecording(undefined);
    await recording.stopAndUnloadAsync();

    let updatedRecordings = [...recordings];
    const { sound, status } = await recording.createNewLoadedSoundAsync();
    updatedRecordings.push({
      sound: sound,
      duration: getDurationFormatted(status.durationMillis),
      file: recording.getURI(),
      title: recordingTitle
    });
    console.log(recordingTitle);
    setRecordings(updatedRecordings);

    setIsCounting(false);
    clearInterval(intervalRef.current);
    setCount(0)
    setRecordStatus(recordOff);
    // setRecordingTitle("")
  }

  function getDurationFormatted(millis) {
    const minutes = millis / 1000 / 60;
    const minutesDisplay = Math.floor(minutes);
    const seconds = Math.round((minutes - minutesDisplay) * 60);
    const secondsDisplay = seconds < 10 ? `0${seconds}` : seconds;
    const minutesDisplay2 = minutesDisplay < 10 ? `0${minutesDisplay}` : minutesDisplay
    return `${minutesDisplay2}:${secondsDisplay}`
  }


  function getRecordingLines() {
    return recordings.map((recordingLine, index) => {
      return (
        <View key={index} style={styles.row}>
          <Text style={styles.fill}>{recordingLine.title} {index + 1} - {recordingLine.duration}</Text>

          <TouchableOpacity style={styles.btn} onPress={() => recordingLine.sound.replayAsync()}>
            <Text>Play</Text>
          </TouchableOpacity>
        </View>
      );
    })
  }

  return (
    <View style={styles.container}>
      <Image source={recordStatus} style={styles.recorder} />
      <TextInput style={styles.formInput}
        onChange={(ev) => setRecordingTitle(ev.target.value)} placeholder="Journal title:" />
      <Text>{message}</Text>
      <Text>{count}</Text>

      <TouchableOpacity onPress={recording ? stopRecording : startRecording}>
        <Text>{recording ? "Stop Recording" : "Start Recording"}</Text>
      </TouchableOpacity>
      {getRecordingLines()}

      {/* 

<Button title={isRecording ? 'Stop Recording' : 'Start Recording'} onPress={isRecording ? stopRecording : startRecording} />
      <Button title={isPlaying ? 'Stop Audio' : 'Play Audio'} onPress={isPlaying ? stopAudio : playAudio} disabled={!recording} /> */}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  fill: {
    flex: 1,
    margin: 16
  },
  btn: {
    margin: 16
  },
  recorder:{
    width: 100,
    height: 100,
    objectFit:"cover",
    marginVertical: 30
  },
});

/*
import React, { useState } from 'react';
import { Button } from 'react-native';
import { AudioRecorderPlayer, AudioPlayer } from 'react-native-audio-recorder-player';

const audioRecorderPlayer = new AudioRecorderPlayer();
const audioPlayer = new AudioPlayer();

export default function App() {
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    const result = await audioRecorderPlayer.startRecorder('myRecording.mp3');
    setIsRecording(true);
    console.log(result);
  };

  const stopRecording = async () => {
    const result = await audioRecorderPlayer.stopRecorder();
    setIsRecording(false);
    console.log(result);
  };

  const playAudio = async () => {
    const result = await audioPlayer.startPlayer('myRecording.mp3');
    console.log(result);
  };

  const stopAudio = async () => {
    const result = await audioPlayer.stopPlayer();
    console.log(result);
  };

  return (
    <>
      <Button title={isRecording ? 'Stop Recording' : 'Start Recording'} onPress={isRecording ? stopRecording : startRecording} />
      <Button title="Play Audio" onPress={playAudio} />
      <Button title="Stop Audio" onPress={stopAudio} />
    </>
  );
}*/

/*
import { Audio } from 'expo-av';
import * as firebase from 'firebase';

// Record audio using Expo Audio
const recording = new Audio.Recording();
await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
await recording.startAsync();

// Upload the audio file to Firebase Storage
const blob = await recording.stopAndUnloadAsync();
const ref = firebase.storage().ref().child('audio/' + new Date().toISOString() + '.m4a');
await ref.put(blob);

// Generate a download URL for the uploaded file
const downloadUrl = await ref.getDownloadURL();

// Store the download URL in Firestore
const db = firebase.firestore();
const docRef = db.collection('recordings').doc();
await docRef.set({ downloadUrl });*/