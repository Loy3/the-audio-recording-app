import { StatusBar } from 'expo-status-bar';
// import React from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, TextInput, Image, ScrollView } from 'react-native';
import { Audio, RecordingOptionsPresets } from "expo-av";
// import { AudioRecorderPlayer, AudioPlayer } from 'react-native-audio-recorder-player';
import React, { useState, useEffect, useRef } from 'react';
// import * as Updates from 'expo-updates';
import { Updates } from 'expo-updates';

import recordOn from "./assets/recorder.png";
import recordOff from "./assets/recorderOff.png";

import firebase from 'firebase/app';
import { storage, db } from './components/fbConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// import { Audio } from 'expo-av';

import { XMLHttpRequest } from 'react-native';

import * as FileSystem from 'expo-file-system';

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
  const [journals, setJournals] = useState([]);
  const [count, setCount] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const intervalRef = useRef(null);

  const [recordStatus, setRecordStatus] = useState(recordOff);

  //Get data 

  const fetchData = (async () => {
    const collectionRef = collection(db, 'journals');
    const data = await getDocs(collectionRef);
    const documents = data.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });
    setJournals(documents);
    console.log(documents);
  })

  useEffect(() => {
    // console.log(recordingTitle);
    // fetchData();
  }, [])

  async function startRecording() {
    const permission = await Audio.requestPermissionsAsync();
    // console.log(permission);

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
      title: recordingTitle,
    });
    console.log(recording.getURI());
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

  function displayTitle() {
    console.log(recordingTitle);
  }

  async function storeJournal() {
    console.log("Tesing", recordingTitle);
    console.log(recordings[0].title);



    try {
      const audioTitle = recordingTitle;
      const journal = `${recordings[0].title}${new Date().getTime()}`;
      const path = `audio/${journal}`;
      // const blob = await recordings[0].ogSound;
      const convertRecord = convertToMp3(recordings[0].file);
      console.log(convertRecord);
      // const storageRef = ref(storage, path);
      // uploadBytes(storageRef, convertRecord).then(() => {
      //   // Get download URL
      //   getDownloadURL(storageRef)
      //     .then(async (url) => {
      //       // Save data to Firestore           
      //       await addDoc(collection(db, "journals"), {
      //         title: audioTitle,
      //         audioName: journal,
      //         audioUrl: url
      //       });
      //     })
      //     .catch((error) => {
      //       console.error(error);
      //     }).then(async () => {
      //       setRecordings([]);
      //       console.log("Success");
      //     })
      // });

    } catch (error) {
      console.log(error)
    }




    // console.log("journal",journal);
    // console.log(recordings);


    // Upload the audio file to Firebase Storage
    // const blob = await recordings[0].sound;
    // // const ref = firebase.storage().ref().child('audio/' + new Date().toISOString() + '.m4a');
    // const ref ="";
    // await ref.put(blob);

    // // Generate a download URL for the uploaded file
    // const downloadUrl = await ref.getDownloadURL();

    // // Store the download URL in Firestore
    // // const db = firebase.firestore();
    // const docRef = db.collection('recordings').doc();
    // await docRef.set({ downloadUrl });
    setRecordings([])
  }


  async function convertToMp3(uri) {
    // const fileInfo = await FileSystem.getInfoAsync(uri);
    // const lastFour = uri.substr(uri.length - 4);
    // const convertedUri = uri.replace(lastFour, '.mp3');
    // console.log(lastFour);
    // await FileSystem.copyAsync({
    //   from: uri,
    //   to: convertedUri,
    // });
    // console.log(convertedUri);

    const localUri = await FileSystem.downloadAsync(uri, FileSystem.documentDirectory + 'audio.mp3');

    // Upload the file to Firebase Storage
    const response = await fetch(localUri);
    const blob = await response.blob();
    return blob;
    // return convertedUri;

  }

  //Delete
  async function deleteRoom(event, data) {
    console.log(data.audioName);
    try {

      deleteAudio(data.audioName).then(async () => {
        await deleteDoc(doc(db, "journals", data.id));
        console.log("Document successfully deleted!");
      }).catch((error) => {
        console.log(error);
      });


    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  }

  async function deleteAudio(audio) {
    const path = `audio/${audio}`;
    const fileRef = ref(storage, path);
    // Delete the file
    // Delete the file
    deleteObject(fileRef).then(() => {
      // File deleted successfully
    }).catch((error) => {
      // Uh-oh, an error occurred!
      console.log(error);
    });
  }

  //update
  const [updateJournal, setUpdateJournal] = useState([]);
  const [newJournalName, setNewJournalName] = useState("");

  function setToUpdate(event, data) {
    setUpdateJournal(data);
  }

  async function journalToUpdate() {
    console.log(newJournalName);
    const docId = updateJournal.id;

    const updateData = {
      title: newJournalName,
      audioName: updateJournal.audioName,
      audioUrl: updateJournal.audioUrl
    }

    const storageRef = doc(db, "journals", docId);

    try {
      await updateDoc(storageRef, updateData);
      console.log('Updated');

    } catch (error) {
      console.log('Failed to Update');
    }
  }





  return (
    <View style={styles.container}>
      {/* <ScrollView scrollEnabled={true} style={{ width: 350, flex:1 }}> */}
      <TextInput style={styles.formInput}
        onChangeText={text => setRecordingTitle(text)}
        value={recordingTitle} placeholder="Journal title:" />
      <TouchableOpacity onPress={displayTitle}>
        <Text>Save title</Text>
        {/* <Image source={recordStatus} style={styles.recorder} /> */}
      </TouchableOpacity>
      <Text>{message}</Text>
      <Text>{count}</Text>

      <TouchableOpacity onPress={recording ? stopRecording : startRecording}>
        {/* <Text>{ ? "Stop Recording" : "Start Recording"}</Text> */}
        <Image source={recordStatus} style={styles.recorder} />
      </TouchableOpacity>

      {getRecordingLines()}
      <TouchableOpacity onPress={storeJournal}>
        <Text>Save</Text>
        {/* <Image source={recordStatus} style={styles.recorder} /> */}
      </TouchableOpacity>
      {/* 

<Button title={isRecording ? 'Stop Recording' : 'Start Recording'} onPress={isRecording ? stopRecording : startRecording} />
      <Button title={isPlaying ? 'Stop Audio' : 'Play Audio'} onPress={isPlaying ? stopAudio : playAudio} disabled={!recording} /> */}



      {/* <View style={{ marginTop: 50 }}>
          {journals.map((jrn, index) => (
            <View key={index} style={{ marginTop: 20 }}>
              <Text>Title: {jrn.title}</Text>

              <View>
                <TouchableOpacity onPress={(ev) => setToUpdate(ev, jrn)}>
                  <Text>Update</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={(ev) => deleteRoom(ev, jrn)}>
                  <Text>Delete</Text>
                </TouchableOpacity>
              </View>

            </View>
          ))}
        </View>


        <View style={{ marginTop: 50 }}>
          <TextInput style={styles.formInput}
            onChangeText={text => setNewJournalName(text)}
            value={newJournalName} placeholder={`Current Title: ${updateJournal.title}`} />
          <TouchableOpacity onPress={journalToUpdate}>
            <Text>Save title</Text>
            {/* <Image source={recordStatus} style={styles.recorder} /> /}
          </TouchableOpacity>
        </View> */}
      {/* </ScrollView> */}
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
    // width: 300,
    marginVertical: 50
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
  recorder: {
    width: 100,
    height: 100,
    objectFit: "cover",
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