import * as functions from "firebase-functions";
import * as admin from "firebase-admin"
import vision from "@google-cloud/vision";

const functionsConfig = functions.config();

admin.initializeApp({
  ...functionsConfig,
  projectId: functionsConfig.service_account.project_id,
  credential: admin.credential.cert({
    ...functionsConfig.service_account,
  }),
});

export const parseCVtoJSON = functions.https.onCall(async (data, context) => {
  
  const client = new vision.v1.ImageAnnotatorClient();

  const gcsSourceUri =  data.cvFilePath
const gcsDestinationUri = "gs://jobquest-374812.appspot.com/results/";

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
// const destinationUri =
//   filesResponse.responses[0].outputConfig.gcsDestination.uri;

  // const storage = admin.app().storage()
  // const filePath = storage.bucket("gs://jobquest-374812.appspot.com").file("results/output-1-to-2.json");
  // const fileObject = await filePath.download();
  // const dataObject = JSON.parse(fileObject.toString());
  // const finalString = dataObject.responses.reduce((accumulator: any, currentValue: any) => accumulator + currentValue.fullTextAnnotation.text, "");
  // console.log(finalString);
  return {
    config: filesResponse.responses[0].outputConfig
  }
});
