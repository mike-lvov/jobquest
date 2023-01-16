import * as functions from "firebase-functions";
import * as admin from "firebase-admin"
import vision from "@google-cloud/vision";
import { v4 as uuidv4 } from 'uuid';

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

export const parseCVtoJSON = functions.https.onCall(async (data, context) => {
  
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
  const [filesResponse] = await operation.promise();
  const destinationUri =
    filesResponse.responses[0].outputConfig.gcsDestination.uri;

  const storage = admin.app().storage()
  const [files] = await storage.bucket("gs://jobquest-374812.appspot.com").getFiles({ prefix: `results/${newJSONFileNamePrefix}` })

  let responseString = '';
  for await (const file of files) {
    const fileObject = await file.download();
    const dataObject = JSON.parse(fileObject.toString());
    const finalString = dataObject.responses.reduce((accumulator: any, currentValue: any) => accumulator + currentValue.fullTextAnnotation.text, "");
    responseString += finalString
  }
  // const [files] = await bucket.getFiles({ prefix: 'userData/some-file-'});
  //  files.forEach(async (file: any) => {
  //     const fileObject = await file.download();
  //     const dataObject = JSON.parse(fileObject.toString());
  //     const finalString = dataObject.responses.reduce((accumulator: any, currentValue: any) => accumulator + currentValue.fullTextAnnotation.text, "");
  //  });


  // const fileObject = await filePath.download();
  // const dataObject = JSON.parse(fileObject.toString());
  // const finalString = dataObject.responses.reduce((accumulator: any, currentValue: any) => accumulator + currentValue.fullTextAnnotation.text, "");
  // console.log(finalString);
  return {
    destinationUri,
    responseString
  }
});
