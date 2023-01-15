import * as functions from "firebase-functions";
import vision from "@google-cloud/vision";

// // Start writing functions
// // https://firebase.google.com/docs/functions/typescript
//
export const parseCVtoJSON = functions.https.onCall(async (data, context) => {
  const CVpath = "gs://jobquest-374812.appspot.com/CV_Anastasiia Baturkina.pdf"
  const client = new vision.v1.ImageAnnotatorClient();

  const gcsSourceUri =  "gs://jobquest-374812.appspot.com/CV_Anastasiia Baturkina.pdf";
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
const destinationUri =
  filesResponse.responses[0].outputConfig.gcsDestination.uri;

  // const textDetection = await client.documentTextDetection(CVpath);

  // functions.logger.log(textDetection);
  // return {
  //   textDetection
  // }
});
