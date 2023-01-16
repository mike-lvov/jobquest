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

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const openai = new OpenAIApi(configuration);
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    temperature: 0.5,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0.5,
    presence_penalty: 0,
    prompt:`Extract valuable information about achievements and skills into a JSON array of strings.
    The answer must only contain data from the CV and no opinions and it must be parsable by JSON.parse
    
    ${responseString}`
  });

  const stringifiedResponse = JSON.stringify(completion, getCircularReplacer());
  const parsedResponse = JSON.parse(stringifiedResponse);

  console.log(parsedResponse.data.choices[0].text);
  const finalAItokens = JSON.parse(parsedResponse.data.choices[0].text)
  
  return {
    finalAItokens
  }
});

// export const aiComplete = functions
//   .runWith({ secrets: ["OPENAI_API_KEY"] })
//   .https
//   .onCall(async (data, context) => {

//     const getCircularReplacer = () => {
//       const seen = new WeakSet();
//       return (key: any, value: any) => {
//         if (typeof value === "object" && value !== null) {
//           if (seen.has(value)) {
//             return;
//           }
//           seen.add(value);
//         }
//         return value;
//       };
//     };

//     const configuration = new Configuration({
//       apiKey: process.env.OPENAI_API_KEY,
//     });
    
//     const openai = new OpenAIApi(configuration);
//     const completion = await openai.createCompletion({
//       model: "text-davinci-003",
//       temperature: 0.5,
//       max_tokens: 1000,
//       top_p: 1,
//       frequency_penalty: 0.5,
//       presence_penalty: 0,
//       prompt:''
//     });

//     const stringifiedResponse = JSON.stringify(completion, getCircularReplacer());
//     const parsedResponse = JSON.parse(stringifiedResponse);

//     console.log(parsedResponse);

//     // console.log(completion.data.choices[0].text);
    
//     return {
//       parsedResponse,
//       text: parsedResponse.data.choices[0].text
//       // data: completion.data.choices[0].text,
//       // fullData: completion
//     }
// })




