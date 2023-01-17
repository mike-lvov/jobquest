"use client"; 

import { Inter } from "@next/font/google";
import styles from "./page.module.css";
import { ChangeEvent, Component, useEffect, useState } from "react";
import { firebaseApp } from "../../firebaseApp";
import { CountDownTimer } from "../components/countDownTimer";
import { getFunctions, httpsCallable } from "firebase/functions"
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { getAnalytics, logEvent } from "firebase/analytics";
// import { ColorRing } from  'react-loader-spinner'

const functions = getFunctions(firebaseApp);
const storage = getStorage(firebaseApp);
const analytics = getAnalytics(firebaseApp);


const inter = Inter({ subsets: ["latin"] });

const Loader = ({ component, duration = 60 }: {component?: JSX.Element, duration?: number}) => <div className={styles.loaderContainer}>
  {/* <ColorRing
    visible={true}
    height="80"
    width="80"
    ariaLabel="blocks-loading"
    wrapperStyle={{}}
    wrapperClass="blocks-wrapper"
    colors={['#e15b64', '#f47e60', '#f8b26a', '#abbd81', '#849b87']}
    /> */}
    
    <div>
      <CountDownTimer duration={duration} />
      <h3 style={{ marginTop: "30px" }}>{component}</h3>
    </div>
  </div>

export default function Home() {
  const [file, setFile] = useState<File>();
  const [expTokens, setExpTokens] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [jobDescription, setJobDescription] = useState<string>()
  const [coverLetter, setCoverLetter] = useState<string>()
  const [step, setStep] = useState(1);
  const [loaderContent, setLoaderContent] = useState<JSX.Element>();
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    logEvent(analytics, "page_view")
  }, [])

  const changeLoaderText = (text: string) => {
    const textComponent = <>{text}</>
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

      try {
        const response = await parseCVtoJSON({ 
          cvFilePath: `gs://${snapshot.metadata.bucket}/${snapshot.metadata.fullPath}`
        });
  
        const tokizedData = (response.data as { finalAItokens: string[] }).finalAItokens;
        // @ts-ignore
        let uniqueTokenizedData = [...new Set(tokizedData)];
  
        setExpTokens(uniqueTokenizedData)
        setIsLoading(false);
      } catch {
        setIsLoading(false);
        setErrorMessage("Something went wrong while trying to extract data from your CV. Contact the developer, please!")
      }

      
    });
    
  }, [file])

  const generateCoverLetter = async () => {
    try {
      const generateCoverLetterCallable = httpsCallable(functions, 'generateCoverLetter');

      const result = await generateCoverLetterCallable({ expTokens, jobDescription });
      console.log({ result });

      return (result.data as any).generatedCoverLetter;
    } catch {
      setIsLoading(false);
      setErrorMessage("Something went wrong while trying to generate the cover letter. Contact the developer, please!")
    }
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
    changeLoaderText("Generating the cover latter using the vacancy text and your data points...");

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
      {errorMessage ? <div className={styles.description}><h1>{errorMessage}</h1></div> :
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
          (isLoading ? <Loader component={loaderContent} duration={50}/> :
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
         (isLoading ? <Loader component={loaderContent} duration={55}/> :
          <>
            <h1>Generated Cover Letter</h1>
            <textarea style={{ height: '500px', width: '90%' }} value={coverLetter} onChange={handleCoverLetterChange}/>
            <div className={styles.buttonsContainer}>
              <button className={styles.nextStepButton} onClick={moveToVacancyStep}>Add different vacancy</button>
              <button className={styles.nextStepButton} onClick={reworkCoverLetter} disabled={!hasExpTokens || !jobDescription}>Rework cover letter</button>
            </div>
          </>)
         }
      </div>}
    </main>
  );
}
