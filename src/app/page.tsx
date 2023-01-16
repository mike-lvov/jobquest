"use client"; 

import { Inter } from "@next/font/google";
import styles from "./page.module.css";
import { ChangeEvent, useEffect, useState } from "react";
import { firebaseApp } from "../../firebaseApp";
import { getFunctions, httpsCallable } from "firebase/functions"
import { getStorage, ref, uploadBytes } from "firebase/storage";

const functions = getFunctions(firebaseApp);
const storage = getStorage(firebaseApp);


const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [file, setFile] = useState<File>();
  const [expTokens, setExpTokens] = useState<string[]>([])

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }

    
  };

  useEffect(() => {
    if (!file) return;

    const parseCVtoJSON = httpsCallable(functions, 'parseCVtoJSON');

    const storageRef = ref(storage, `CVs/${file.name}`);
    
    uploadBytes(storageRef, file).then(async (snapshot) => {
      console.log('Uploaded a blob or file!');
      const response = await parseCVtoJSON({ 
        cvFilePath: `gs://${snapshot.metadata.bucket}/${snapshot.metadata.fullPath}`
      });
      console.log({ response });

      const tokizedData = response.data as { finalAItokens: string[] }).finalAItokens;
      let uniqueTokenizedData = [...new Set(tokizedData)];
      setExpTokens(uniqueTokenizedData)
    });
    
  }, [file])

  // const callAi = async () => {
  //   const callAiCallable = httpsCallable(functions, 'aiComplete');
  //   const result = await callAiCallable();
  //   console.log({ result })
  // }

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <div>
          <label>Choose file to upload</label>
          <input type="file" id="file" name="file" onChange={handleFileChange}/>

          <div>{file && `${file.name} - ${file.type}`}</div>
          <div>{expTokens.map(token => <p key={token}>{token}</p>)}</div>
          {/* <button onClick={callAi}>Call AI</button> */}
        </div>
      </div>
    </main>
  );
}
