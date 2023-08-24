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

import stopAud from "./assets/stop.png";
import playAud from "./assets/play.png";

import audMenu from "./assets/dots.png";
import audEdit from "./assets/edit.png";
import audDelete from "./assets/delete.png";

import firebase from 'firebase/app';
import { storage, db } from './components/fbConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// import { Audio } from 'expo-av';

// import { XMLHttpRequest } from 'react-native';

import * as FileSystem from 'expo-file-system';

export default function App() {

  //Store record
  // const recordingSettings = {
  //   android: {
  //     extension: ".m4a",
  //     outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
  //     audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
  //     sampleRate: 44100,
  //     numberOfChannels: 2,
  //     bitRate: 128000,
  //   },
  //   ios: {
  //     extension: ".m4a",
  //     outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
  //     audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MIN,
  //     sampleRate: 44100,
  //     numberOfChannels: 2,
  //     bitRate: 128000,
  //     linearPCMBitDepth: 16,
  //     linearPCMIsBigEndian: false,
  //     linearPCMIsFloat: false,
  //   },
  // };

  const [recording, setRecording] = useState();
  const [recordings, setRecordings] = useState([]);
  const [message, setMessage] = useState("");
  const [recordingTitle, setRecordingTitle] = useState("");
  const [journals, setJournals] = useState([]);
  const [count, setCount] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [countMin, setCountMin] = useState(0);
  const intervalRef = useRef(null);

  const [recordStatus, setRecordStatus] = useState(recordOff);

  //Get data 

  const fetchData = (async () => {

    let documents = [];
    const collectionRef = collection(db, 'journals');
    onSnapshot(collectionRef, (snapshot) => {

      const fetchedDocuments = [];
      snapshot.forEach((doc) => {
        fetchedDocuments.push({ id: doc.id, ...doc.data() });
      });
      setJournals(fetchedDocuments);

    });

  })

  useEffect(() => {
    fetchData();
  }, [])

  useEffect(() => {
    // console.log(journals);
  }, [journals])

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

        let minCount = 0;
        setIsCounting(true);
        intervalRef.current = setInterval(() => {
          setCount((prevCount) => prevCount + 1);
          minCount = (prevCount) => prevCount + 1;
          if (minCount >= 60) {
            setCountMin((prevCountMin) => prevCountMin + 1);
          }

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

  const [menuTitle, setMenuTitle] = useState("Title");
  const [menuStatus, setMenuStatus] = useState(false);
  function handleMenu(event, title, type) {
    switch (type) {
      case "show":
        setMenuStatus(true);
        setMenuTitle(title);
        break;
      case "hide":
        setMenuStatus(false);
        setMenuTitle("Title");
        break;
      default:
    }
  }




  function displayTitle() {
    console.log(recordingTitle);
  }

  async function storeJournal() {

    // console.log("Tesing", recordingTitle);
    // console.log(recordings[0].sound);



    try {
    
      // const blob = await recordings[0].ogSound;
      const recordUri = recordings[0].file;
      // const convertRecord = recordings[0].sound;
      // console.log(convertRecord);

      //Store
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          try {
            resolve(xhr.response);
          } catch (error) {
            console.log("Line 205 error:", error);
          }
        };
        xhr.onerror = (e) => {
          console.log(e);
          reject(new TypeError("Network request failed"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", recordUri, true);
        xhr.send(null);
      });
      if (blob != null) {
        const uriParts = recordUri.split(".");
        const fileType = uriParts[uriParts.length - 1];

        const audioTitle = recordingTitle;
        const journal = `${recordings[0].title}${new Date().getTime()}.${fileType}`;
        const path = `audio/${journal}`;

        const storageRef = ref(storage, path);
        uploadBytes(storageRef, blob).then(() => {
          // Get download URL
          getDownloadURL(storageRef)
            .then(async (url) => {
              // Save data to Firestore           
              await addDoc(collection(db, "journals"), {
                title: audioTitle,
                audioName: journal,
                audioUrl: url
              });
            })
            .catch((error) => {
              console.error(error);
            }).then(async () => {
              setRecordings([]);
              console.log("Success");
            })
        });



        // firebase
        //   .storage()
        //   .ref()
        //   .child(`nameOfTheFile.${fileType}`)
        //   .put(blob, {
        //     contentType: `audio/${fileType}`,
        //   })
        //   .then(() => {
        //     console.log("Sent!");
        //   })
        //   .catch((e) => console.log("error:", e));

      } else {
        console.log("erroor with blob");
      }
      //End




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
      console.log("line 287",error)
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


  // async function convertToMp3(sound) {
  //   // // const fileInfo = await FileSystem.getInfoAsync(uri);
  //   // // const lastFour = uri.substr(uri.length - 4);
  //   // // const convertedUri = uri.replace(lastFour, '.mp3');
  //   // // console.log(lastFour);
  //   // // await FileSystem.copyAsync({
  //   // //   from: uri,
  //   // //   to: convertedUri,
  //   // // });
  //   // // console.log(convertedUri);

  //   // const localUri = await FileSystem.downloadAsync(uri, FileSystem.documentDirectory + 'audio.mp3');

  //   // // Upload the file to Firebase Storage
  //   // const response = await fetch(localUri);
  //   // const blob = await response.blob();
  //   // return blob;
  //   // // return convertedUri;

  //   try {
  //     console.log(sound);
  //     const exportOptions = {
  //       outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4, // or Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MP4
  //       audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM // or Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC
  //     };

  //     const exportedFile = await sound.exportAsync(exportOptions);
  //     const uri = exportedFile.uri;
  //     console.log(uri);

  //     return uri;

  //   } catch (error) {
  //     console.log(error);
  //   }

  // }

  //Delete
  async function deleteRoom(event, data) {
    console.log(data.audioName);
    try {

      deleteAudio(data.audioName).then(async () => {
        await deleteDoc(doc(db, "journals", data.id));
        console.log("Document successfully deleted!");
        setMenuStatus(false);
        setMenuTitle("Title");
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
    deleteObject(fileRef).then(() => {
    }).catch((error) => {
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
      setMenuStatus(false);
      setMenuTitle("Title");
    } catch (error) {
      console.log('Failed to Update');
    }
  }



  function getRecordingLines() {
    return recordings.map((recordingLine, index) => {
      return (
        <View key={index}>
          <View style={styles.row}>
            <Text style={styles.fill}>{recordingLine.title}</Text>
            <Text style={styles.fillD}>{recordingLine.duration}</Text>
            <TouchableOpacity style={styles.btn1} onPress={() => recordingLine.sound.replayAsync()}>
              <Image source={playAud} style={styles.playAud} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn2} onPress={() => recordingLine.sound.stopAsync()}>
              <Image source={stopAud} style={styles.stopAud} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={storeJournal} style={styles.saveBTN}>
            <Text style={styles.saveBTNTxt}>Save</Text>
          </TouchableOpacity>
        </View>
      );
    })
  }

  return (
    <View style={styles.container}>
      <ScrollView scrollEnabled={true} >

        <View style={styles.titleInput}>
          <TextInput style={styles.formInput}
            onChangeText={text => setRecordingTitle(text)}
            value={recordingTitle} placeholder="Add Journal Title:" />
        </View>
        {/* <TouchableOpacity onPress={displayTitle}>
        <Text>Save title</Text>
        {/* <Image source={recordStatus} style={styles.recorder} /> /}
      </TouchableOpacity> */}
        <Text>{message}</Text>


        <View style={styles.recordCont}>
          <View style={styles.recordContLighter}>
            <View style={styles.recordContLight}>
              <TouchableOpacity onPress={recording ? stopRecording : startRecording}>
                {/* <Text>{ ? "Stop Recording" : "Start Recording"}</Text> */}
                <Image source={recordStatus} style={styles.recorder} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.counterCont}>
          <Text style={styles.counter}>{countMin}:{count < 10 ? `0${count}` : count}</Text>
        </View>



        {getRecordingLines()}

        {/* 

<Button title={isRecording ? 'Stop Recording' : 'Start Recording'} onPress={isRecording ? stopRecording : startRecording} />
      <Button title={isPlaying ? 'Stop Audio' : 'Play Audio'} onPress={isPlaying ? stopAudio : playAudio} disabled={!recording} /> */}

        <View style={styles.displayJournals}>
          <View >
            {journals.map((jrn, index) => (
              <View key={index} style={styles.card}>
                <TouchableOpacity style={styles.cardBtn} >
                  <Image source={playAud} style={styles.player} />
                </TouchableOpacity>
                <Text style={styles.cardTitle}>Title: {jrn.title} </Text>

                <View style={styles.cardOpt}>
                  {menuTitle !== jrn.title
                    ? <TouchableOpacity onPress={(ev) => handleMenu(ev, jrn.title, "show")}>
                      <Image source={audMenu} style={styles.audMenuOpt} />
                    </TouchableOpacity>
                    : null}

                  {menuStatus === true && menuTitle === jrn.title
                    ? <View style={{ flexDirection: "row" }}>
                      <TouchableOpacity onPress={(ev) => setToUpdate(ev, jrn)}>
                        <Image source={audEdit} style={styles.audOpt} />
                      </TouchableOpacity>

                      <TouchableOpacity onPress={(ev) => deleteRoom(ev, jrn)}>
                        <Image source={audDelete} style={styles.audOpt} />
                      </TouchableOpacity></View>
                    : null}

                  {/* <TouchableOpacity onPress={(ev) => setToUpdate(ev, jrn)}>
                  <Image source={audEdit} style={styles.audOpt} />
                </TouchableOpacity>

                <TouchableOpacity onPress={(ev) => deleteRoom(ev, jrn)}>
                  <Image source={audDelete} style={styles.audOpt} />
                </TouchableOpacity> */}
                </View>

              </View>
            ))}
          </View>
        </View>

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
      
        </View>


        <View style={{ marginTop: 50 }}>
          <TextInput style={styles.formInput}
            onChangeText={text => setNewJournalName(text)}
            value={newJournalName} placeholder={`Current Title: ${updateJournal.title}`} />
          <TouchableOpacity onPress={journalToUpdate}>
            <Text>Save title</Text>
          </TouchableOpacity>
        </View> */}
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "whitesmoke",
    paddingVertical: 80,
    alignItems: "center"
  },
  titleInput: {
    width: 350,
    flex: 1,
    justifyContent: "center",
  },
  formInput: {
    padding: 10,
    borderBottomColor: "black",
    width: "100%",
    textAlign: "center",
    fontSize: 20,
    backgroundColor: "#FAFAFA"
  },
  counterCont: {
    marginTop: 50,
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  counter: {
    fontSize: 50,
    fontWeight: "bold",
    color: "#636363"
  },

  recordCont: {
    marginTop: 80,
    width: "100%",
    height: 350,
    backgroundColor: "#DCDCDC",
    borderRadius: 350
  },

  recordContLighter: {
    backgroundColor: "#B6B6B4",
    height: "92%",
    width: "92%",
    marginVertical: "4%",
    marginHorizontal: "4%",
    borderRadius: 350
  },
  recordContLight: {
    backgroundColor: "#808080",
    height: "92%",
    width: "92%",
    marginVertical: "4%",
    marginHorizontal: "4%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 350
  },

  recorder: {
    width: 200,
    height: 200,
    objectFit: "cover",
    // marginVertical: 30
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 40
  },
  fill: {
    flex: 1,
    margin: 5,
    fontSize: 16,
    textAlign: "center"
  },
  fillD: {
    flex: 1,
    margin: 5,
    fontSize: 16,
    textAlign: "left",
    paddingLeft: 30
  },
  btn1: {
    margin: 5
  },
  btn2: {
    margin: 5
  },
  stopAud: {
    width: 40,
    height: 40
  },
  playAud: {
    width: 33,
    height: 33
  },
  saveBTN: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
    backgroundColor: "#B6B6B4",
    borderRadius: 100,
  },
  saveBTNTxt: {
    fontSize: 18
  },


  displayJournals: {
    marginTop: 100,
    backgroundColor: "white"
  },
  card: {
    margin: "3%",
    width: "94%",
    flexDirection: "row",
    backgroundColor: "whitesmoke"
  },
  cardBtn: {
    margin: 5
  },
  cardTitle: {
    position: "absolute",
    left: 80,
    top: 15,
    fontSize: 18
  },
  cardOpt: {
    position: "absolute",
    right: 10,
    flexDirection: "row"
  },
  audMenuOpt: {
    width: 30,
    height: 30,
    marginTop: 15
  },
  audOpt: {
    width: 35,
    height: 35,
    marginTop: 15,
    marginRight: 5
  },

  player: {
    height: 50,
    width: 50
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