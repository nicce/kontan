import * as functions from "firebase-functions";
import * as fbAdmin from "firebase-admin";

import interactive from "./slackInteractive";
import event from "./slackEvent";
import {UserService, User} from "./services/UserService";
import {OfficeService} from "./services/OfficeService";

// // Start writing functions
// // https://firebase.google.com/docs/functions/typescript

const admin = fbAdmin.initializeApp();
export const checkUser = functions
    .region("europe-west1")
    .https
    .onRequest(async (request, response) => {
      const {tag} = request.body satisfies User["tag"];
      const userService = new UserService(admin);
      if (!(await userService.tagExists(tag))) {
        response.status(404).send("User doesn't exist");
        return;
      }
      const officeService = new OfficeService(admin);
      const {status} = await officeService.checkUser(tag);
      if (status === "OUTBOUND") {
        response.status(409).send("User checked out");
      } else if (status === "INBOUND") {
        response.status(201).send("User checked in");
      }
    });

export const slackInteractive = functions
    .region("europe-west1")
    .https
    .onRequest(
        async (request, response) => {
          await interactive(request, response, admin);
        }
    );

export const slackEvent = functions
    .region("europe-west1")
    .https
    .onRequest(async (request, response) => {
      await event(request, response, admin);
    } );

export const scheduledFunction = functions
    .region("europe-west1")
    .pubsub
    .schedule("every day 02:00")
    .timeZone("Europe/Stockholm")
    .onRun(async () => {
      const service = new OfficeService(admin);
      await service.resetInbound();
      await service.incrementDays();
    });
