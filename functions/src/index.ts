import * as functions from "firebase-functions";
import vision from "@google-cloud/vision";

// // Start writing functions
// // https://firebase.google.com/docs/functions/typescript
//
export const parseCVtoJSON = functions.https.onCall(async (data, context) => {
  const CVpath = "gs://jobquest-374812.appspot.com/CV_Anastasiia Baturkina.pdf"
  const client = new vision.ImageAnnotatorClient();

  const [textDetection] = await client.textDetection(CVpath);
  const annotation = textDetection.textAnnotations;

  functions.logger.log(annotation);
  return {
    annotation
  }
});
