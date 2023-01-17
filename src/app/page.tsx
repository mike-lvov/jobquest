"use client"; 

import { Inter } from "@next/font/google";
import styles from "./page.module.css";
import { ChangeEvent, Component, useEffect, useState } from "react";
import { firebaseApp } from "../../firebaseApp";
import { getFunctions, httpsCallable } from "firebase/functions"
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { ColorRing } from  'react-loader-spinner'

const functions = getFunctions(firebaseApp);
const storage = getStorage(firebaseApp);


const inter = Inter({ subsets: ["latin"] });

const Loader = ({ component }: {component?: JSX.Element}) => <div className={styles.loaderContainer}>
  <ColorRing
    visible={true}
    height="80"
    width="80"
    ariaLabel="blocks-loading"
    wrapperStyle={{}}
    wrapperClass="blocks-wrapper"
    colors={['#e15b64', '#f47e60', '#f8b26a', '#abbd81', '#849b87']}
    />
    <div>
      {component}
    </div>
  </div>

export default function Home() {
  const [file, setFile] = useState<File>();
  const [expTokens, setExpTokens] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [jobDescription, setJobDescription] = useState<string>()
  const [coverLetter, setCoverLetter] = useState<string>()
  const [step, setStep] = useState(1);
  const [loaderContent, setLoaderContent] = useState<JSX.Element>()

  const changeLoaderText = (text: string) => {
    const textComponent = <>{text}<br/> It usually takes around 1 minute</>
    setLoaderContent(textComponent);
  }

  const hasExpTokens = expTokens.length !== 0;

  const goToNextStep = () => {
    setStep(prevStep => prevStep + 1)
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    if (!file) return;
    goToNextStep();
    setIsLoading(true);
    changeLoaderText("Uploading your CV...");

    const parseCVtoJSON = httpsCallable(functions, 'parseCVtoJSON');

    const storageRef = ref(storage, `CVs/${file.name}`);

    uploadBytes(storageRef, file).then(async (snapshot) => {
      changeLoaderText("Extracting information from your CV...");
      const response = await parseCVtoJSON({ 
        cvFilePath: `gs://${snapshot.metadata.bucket}/${snapshot.metadata.fullPath}`
      });

      const tokizedData = (response.data as { finalAItokens: string[] }).finalAItokens;
      // @ts-ignore
      let uniqueTokenizedData = [...new Set(tokizedData)];

      setExpTokens(uniqueTokenizedData)
      setIsLoading(false);
    });
    
  }, [file])

  const generateCoverLetter = async () => {
    const generateCoverLetterCallable = httpsCallable(functions, 'generateCoverLetter');

    const result = await generateCoverLetterCallable({ expTokens, jobDescription });
    console.log({ result });

    return (result.data as any).generatedCoverLetter;
  }

  const reworkCoverLetter = async () => {
    setIsLoading(true);
    changeLoaderText("Reworking the cover letter using the previously added information...");

    const coverLetter = await generateCoverLetter()

    setCoverLetter(coverLetter);
    setIsLoading(false);
  }

  const moveToCoverLetterStep = async () => {
    goToNextStep();
    setIsLoading(true);
    changeLoaderText("Generating the cover later using the vacancy text and your data points...");

    const coverLetter = await generateCoverLetter()

    setCoverLetter(coverLetter);
    setIsLoading(false);
  }

  const moveToVacancyStep = () => {
    setStep(3)
    setJobDescription("")
  }

  const handleJobDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJobDescription(e.target.value);
  }

  const handleCoverLetterChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCoverLetter(e.target.value);
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.pageTitle}>Cover Letter Generator</h1>
      <h3 className={styles.stepsCount}>Step: {step}/4</h3>
      <div className={styles.description}>
          
        {!isLoading && step === 1 && 
          <>
            <span>
              Upload your CV. It must be in English.
            </span>
            <span>
              Only PDF format is acceptable
            </span>
            <br />
            <input type="file" id="file" name="file" onChange={handleFileChange}/>
          </>
          }
          <br/>

          {step === 2 && 
          (isLoading ? <Loader component={loaderContent}/> :
          <>
            <h2>Here is a list of data points that were extracted from your CV. <br/> In the future versions, you&apos;ll be able to edit them</h2>
            <br />
            <br />
            <br />
            <div>{expTokens.map(token => <p key={token}>{token}</p>)}</div>
            <button className={styles.nextStepButton} onClick={goToNextStep}>Next Step</button>
          </>)
          }
          

          {!isLoading && step === 3 && 
          <>
            <h3>Add the job vacancy description</h3>
            <br />
            <br />
            <textarea style={{ height: '500px', width: '90%' }} value={jobDescription} onChange={handleJobDescriptionChange}/>
            <br />
            <br />
            <br />
            <br />
            <button className={styles.nextStepButton} onClick={moveToCoverLetterStep} disabled={!hasExpTokens || !jobDescription}>Generate Cover Letter</button>
          </>
          }
         
         {step === 4 && 
         (isLoading ? <Loader component={loaderContent}/> :
          <>
            <h1>Generated Cover Letter</h1>
            <textarea style={{ height: '500px', width: '90%' }} value={coverLetter} onChange={handleCoverLetterChange}/>
            <div className={styles.buttonsContainer}>
              <button className={styles.nextStepButton} onClick={moveToVacancyStep}>Add different vacancy</button>
              <button className={styles.nextStepButton} onClick={reworkCoverLetter} disabled={!hasExpTokens || !jobDescription}>Rework cover letter</button>
            </div>
          </>)
         }
      </div>
    </main>
  );
}
