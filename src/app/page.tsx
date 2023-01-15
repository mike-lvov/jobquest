"use client"; 

import { Inter } from "@next/font/google";
import styles from "./page.module.css";
import { ChangeEvent, useEffect, useState } from "react";
import { firebaseApp } from "../../firebaseApp";
import { getFunctions, httpsCallable } from "firebase/functions"

const functions = getFunctions(firebaseApp);

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [file, setFile] = useState<File>();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    
    const helloWorld = httpsCallable(functions, 'helloWorld');
    helloWorld();
  }, [])

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <div>
          <label>Choose file to upload</label>
          <input type="file" id="file" name="file" onChange={handleFileChange}/>

          <div>{file && `${file.name} - ${file.type}`}</div>
        </div>
      </div>
    </main>
  );
}
