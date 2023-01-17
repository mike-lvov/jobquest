import * as functions from "firebase-functions";
import * as admin from "firebase-admin"
import vision from "@google-cloud/vision";
import { v4 as uuidv4 } from 'uuid';
import { Configuration, OpenAIApi } from "openai";
// import {SecretManagerServiceClient}  from '@google-cloud/secret-manager';


const functionsConfig = functions.config();

admin.initializeApp({
  ...functionsConfig,
  projectId: functionsConfig.service_account.project_id,
  credential: admin.credential.cert({
    ...functionsConfig.service_account,
    private_key: functionsConfig.service_account.private_key.replace(
      /\\n/g,
      "\n"
    )
  }),
});

const parseString = (string: string) => {
  return string.split("\n")
    .filter((line) => line !== "")
    .map((line) => line.trim().replace(/^-\s*/, ""))
}

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: any, value: any) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

export const parseCVtoJSON = functions.runWith({ secrets: ["OPENAI_API_KEY"] }).https.onCall(async (data, context) => {
  
  const client = new vision.v1.ImageAnnotatorClient();

  const newJSONFileNamePrefix = `${uuidv4()}`

  const gcsSourceUri =  data.cvFilePath
  const gcsDestinationUri = `gs://jobquest-374812.appspot.com/results/${newJSONFileNamePrefix}`;

  const inputConfig = {
    // Supported mime_types are: 'application/pdf' and 'image/tiff'
    mimeType: "application/pdf",
    gcsSource: {
      uri: gcsSourceUri,
    },
  };
  const outputConfig = {
    gcsDestination: {
      uri: gcsDestinationUri,
    },
  };
  const features = [{type: "DOCUMENT_TEXT_DETECTION"}];
  const request = {
    requests: [
      {
        inputConfig: inputConfig,
        features: features,
        outputConfig: outputConfig,
      },
    ],
  };

  // @ts-ignore
  const [operation] = await client.asyncBatchAnnotateFiles(request);
  await operation.promise();

  const storage = admin.app().storage()
  const [files] = await storage.bucket("gs://jobquest-374812.appspot.com").getFiles({ prefix: `results/${newJSONFileNamePrefix}` })

  let responseString = '';
  for await (const file of files) {
    const fileObject = await file.download();
    const dataObject = JSON.parse(fileObject.toString());
    const finalString = dataObject.responses.reduce((accumulator: any, currentValue: any) => accumulator + currentValue.fullTextAnnotation.text, "");
    responseString += finalString
  }

  console.log("OCR response:", responseString);

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const openai = new OpenAIApi(configuration);
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    temperature: 0.7,
    max_tokens: 2000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    prompt:`Extract every valuable piece of information about the person, his/her achievements into a bulleted list.
    Don't include dates, durations, company names, company links or job titles.
    Don't include language proficiency if it's not relevant for the cover letter.
      
    The text:
    ${responseString}
    
  
    list:
- `
  });

  const stringifiedResponse = JSON.stringify(completion, getCircularReplacer());
  const parsedResponse = JSON.parse(stringifiedResponse);

  const aiTextResponse = parsedResponse.data.choices[0].text;
  console.log(aiTextResponse);
  const finalAItokens = parseString(aiTextResponse)
  
  return {
    finalAItokens
  }
});


export const generateCoverLetter = functions.runWith({ secrets: ["OPENAI_API_KEY"] }).https.onCall(async (data, context) => {
  const {
    expTokens, jobDescription
  } = data;

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const openai = new OpenAIApi(configuration);
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    temperature: 0.9,
    max_tokens: 800,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0.6,
    stop: [" Human:", " AI:"],
    prompt:`The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly.
    Human: I'll provide you with a list of a person's achievements, experience, and skills. You should create the cover letter based on the vacancy information that I will also provice.
    Start generating right away
    
    List of information about the person: ${expTokens}
    
    Vacancy: ${jobDescription}`
  });

  const stringifiedResponse = JSON.stringify(completion, getCircularReplacer());
  const parsedResponse = JSON.parse(stringifiedResponse);

  const generatedCoverLetter = parsedResponse.data.choices[0].text;
  console.log({ generatedCoverLetter });

  return {
    generatedCoverLetter,
    parsedResponse
  }
})