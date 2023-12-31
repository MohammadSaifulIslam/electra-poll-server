const express = require("express");
const schedule = require("node-schedule");
const cors = require("cors");
require("dotenv").config();
const xlsx = require("xlsx");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const { SessionsClient } = require("dialogflow");
const path = require("path");
const moment = require("moment");

const port = process.env.PORT || 5000;
const app = express();
module.exports = app;

// midlewire
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// =============================Initialize Dialogflow client start======================
const credentialsPath = path.join(
  __dirname,
  "/electrapollagent-uxap-dd518e96b30c.json"
);
const sessionClient = new SessionsClient({
  keyFilename: credentialsPath,
});
// Generate a unique session ID
const sessionID = `${Date.now()}-${Math.random()
  .toString(36)
  .substring(2, 15)}`;

// ===========================Initialize Dialogflow client end=======================

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7p3fj4a.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const electionCollection = client.db("electraPollDB").collection("elections");
const commentCollection = client.db("electraPollDB").collection("comments");
const votersCollection = client.db("electraPollDB").collection("voters");
const reviewCollection = client.db("electraPollDB").collection("reviews");
const replyCollection = client.db("electraPollDB").collection("reply");

const notificationCollection = client
  .db("electraPollDB")
  .collection("notifications");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const database = client.db("electraPollDB");
    const userCollection = database.collection("users");
    const blogCollection = database.collection("blogs");
    const pullCollection = database.collection("vote");
 
    
    
    
    // app.listen(port, () => {
    //   console.log(`Server is running on port ${port}`);
    // });
    // // .............Authentication related api
    // app.get("/users/:email", async (req, res) => {
    //   const email = req.params.email;

    //   const query = { email: email };
    //   const result = await userCollection.find(query).toArray();
    //   res.send(result);
    // });


    app.post("/vote", async (req, res) => {
      try {
        // Assuming you want to extract the candidate and userEmail from the request body
        const { candidate, userEmail } = req.body;
    
        // Check if candidate and userEmail are provided
        if (!candidate || !userEmail) {
          return res.status(400).json({ error: 'Both candidate and userEmail are required' });
        }
    
        // Check if the user has already voted
        const existingVote = await pullCollection.findOne({ userEmail });
    
        if (existingVote) {
          // If the user has already voted, update their vote
          const updatedVote = await pullCollection.updateOne(
            { userEmail },
            { $set: { candidate, timestamp: new Date() } }
          );
    
          if (updatedVote.modifiedCount === 1) {
            // Update the vote count
            votes[candidate] = (votes[candidate] || 0) + 1;
            // Decrement the vote count for the previously selected candidate
            votes[existingVote.candidate] = (votes[existingVote.candidate] || 1) - 1;
    
            return res.status(200).json({ message: 'Vote updated successfully' });
          } else {
            return res.status(500).json({ error: 'Failed to update the vote' });
          }
        } else {
          // If the user has not voted before, insert a new vote
          const result = await pullCollection.insertOne({
            candidate,
            userEmail,
            timestamp: new Date(), // You can add a timestamp if needed
          });
    
          if (result.insertedCount === 1) {
            // Update the vote count
            votes[candidate] = (votes[candidate] || 0) + 1;
    
            return res.status(201).json({ message: 'Vote recorded successfully' });
          } else {
            return res.status(500).json({ error: 'Failed to record the vote' });
          }
        }
      } catch (error) {
        console.error('Error recording/updating vote:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });
    


    // Get single user by email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    // update user>>
    app.patch("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const updatedData = req.body;
        const result = await userCollection.updateOne(
          { email: email },
          { $set: updatedData }
        );

        if (result.modifiedCount > 0) {
          res.status(200).json({ message: "User data updated successfully" });
        } else {
          res.status(404).json({ message: "User not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "account already exist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get all users
    app.get("/all-users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // delete user api
    app.delete("/all-users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    //  update user role admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // update user role user
    app.patch("/users/user/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: { role: "user" },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // send email related code

    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.email,
        pass: process.env.email_pass,
      },
    });

    // ======================voter related apis===========================
    // get all voters by manager's email
    app.get("/voters/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const result = await votersCollection.findOne(query);
      res.send(result);
    });

    // add voter api
    app.post("/add-voters", async (req, res) => {
      const voterInfo = req.body;

      const votersList = await votersCollection.findOne({
        email: voterInfo.email,
      });
      const matchingEmail = votersList?.voters.find(
        (voter) => voter.voterEmail === voterInfo.voter.voterEmail
      );

      if (matchingEmail) {
        res.send({ exist: true });
      } else {
        const result = await votersCollection.updateOne(
          { email: voterInfo.email },
          { $push: { voters: voterInfo.voter } },
          { upsert: true }
        );
        res.send(result);
      }
    });

    // add  excel voters
    app.patch("/add-excel-voters", async (req, res) => {
      const voterInfo = req.body;
      const votersList = await votersCollection.findOne({
        email: voterInfo.email,
      });

      const givenVoters = votersList
        ? [...votersList.voters, ...voterInfo.voterEmails]
        : [...voterInfo.voterEmails];
      const voters = givenVoters.reduce(
        (acc, voter) => {
          if (!acc.emails.has(voter.voterEmail)) {
            acc.emails.add(voter.voterEmail);
            acc.result.push(voter);
          }
          return acc;
        },
        { emails: new Set(), result: [] }
      ).result;

      const result = await votersCollection.updateOne(
        { email: voterInfo.email },
        { $set: { voters: voters } },
        { upsert: true }
      );
      if (
        result.matchedCount > 0 &&
        result.modifiedCount === 0 &&
        result.upsertedCount === 0
      ) {
        res.send({ exist: true });
      } else {
        res.send(result);
      }
    });

    // delete voter api
    app.patch("/voters/:id", async (req, res) => {
      const id = req.params.id;
      const email = req.body.voterEmail;

      const votersList = await votersCollection.findOne({
        _id: new ObjectId(id),
      });
      const filteredVoters = votersList.voters.filter(
        (voter) => voter.voterEmail !== email
      );
      // console.log(filteredVoters);

      const result = await votersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { voters: filteredVoters } }
      );
      res.send(result);
    });

    // delete voter api
    app.delete("/voters/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await votersCollection.deleteOne(query);
      res.send(result);
    });

    // =============== add elections ============
    app.post("/add-election", async (req, res) => {
      const election = req.body;
      const result = await electionCollection.insertOne(election);
      res.send(result);
    });

    // -=============== update elections ===============
    // app.patch("/election/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const election = req.body;
    //   delete election._id;

    //   const result = await electionCollection.updateOne(
    //     { _id: new ObjectId(id) },
    //     { $set: election }
    //   );

    //   if ((result && election.status === "published") || "ongoing") {
    //     const getElection = await electionCollection.findOne({
    //       _id: new ObjectId(id),
    //     });

    //     const emails = [];

    //     getElection.voterEmails?.map((e) => emails.push(e.email));

    //     for (const voter of getElection.voterEmails) {
    //       try {
    //         const mailInfo = await transporter.sendMail({
    //           from: "codecrafters80@gmail.com",
    //           to: voter.email,
    //           subject: `Vote Now: ${getElection?.title}`,
    //           html: `
    //           <!DOCTYPE html>
    //           <html lang="en">
    //           <head>
    //               <meta charset="UTF-8">
    //               <meta name="viewport" content="width=device-width, initial-scale=1.0">
    //               <title>Email Template</title>
    //               <style>
    //                   body {
    //                       font-family: Arial, sans-serif;
    //                       margin: 0;
    //                       padding: 0;
    //                       border-radius: 15px;
    //                   }

    //                   @media only screen and (max-width: 576px) {
    //                       body {
    //                           width: 100% !important;
    //                       }
    //                   }

    //                   @media only screen and (max-width: 376px) {
    //                       body {
    //                           width: 100% !important;
    //                       }
    //                   }
    //               </style>
    //           </head>
    //           <body style="margin: 0 auto;">
    //               <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    //                   <tr>
    //                       <td align="center" style="padding: 20px 0;">
    //                           <img src="https://i.ibb.co/J2k86ts/logo.png" alt="Company Logo" width="150">
    //                       </td>
    //                   </tr>
    //                   <tr>
    //                       <td bgcolor="#f0fdf4" style="padding: 40px 20px; color: black;line-height:20px">
    //                           <h3>You are cordially invited to cast your vote in the upcoming ${getElection?.title} election - ${getElection?.organization}.</h3>
    //                           <p>Hello,</p>
    //                           <p style="color: black">We are employing a sophisticated online voting system to ensure accuracy and transparency. You have been allocated a unique voting key, granting you one-time access to this process. Please treat this key with confidentiality and avoid sharing or forwarding this communication.</p>
    //                           <p>Should you have any queries or wish to share feedback regarding the election, or if you prefer not to receive subsequent voting notifications, please contact ${getElection?.email}</p>

    //                           <p style="padding-bottom: 10px">you will need to enter the access key and password to vote. Don't share it with anybody</p>
    //                           <p style="font-weight:700">Access Key: ${voter.accessKey}</p>
    //                           <p style="font-weight:700">Password: ${voter.password}</p>

    // 					  <p style="font-weight:700">Your voting link is:  http://localhost:5000/vote?email=${voter.email}&&id=${getElection._id} </p>
    //                           <hr />

    //                           <p>Thank you for your participation.</p>
    //                       </td>
    //                   </tr>
    //                   <tr>
    //                       <td bgcolor="#f4f4f4" style="text-align: center; padding: 10px 0;">
    //                           <p>&copy; 2023 Electro Poll. All rights reserved.</p>
    //                       </td>
    //                   </tr>
    //               </table>
    //           </body>
    //           </html>
    //       `,
    //         });

    //         console.log("Message sent: %s", mailInfo.messageId);
    //       } catch (error) {
    //         console.error("Error sending email:", error);
    //       }
    //     }
    //   }
    //   res.send(result);
    // });

    app.patch("/election/:id", async (req, res) => {
      const id = req.params.id;
      const election = req.body;
      delete election._id;

      try {
        const result = await electionCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: election }
        );

        if (
          (result && election.status === "published") ||
          election.status === "ongoing"
        ) {
          const getElection = await electionCollection.findOne({
            _id: new ObjectId(id),
          });

          if (!getElection) {
            return res.status(404).send({ error: "Election not found" });
          }

          const emails = [];

          getElection.voterEmails?.map((e) => emails.push(e.email));

          for (const voter of getElection.voterEmails) {
            try {
              const mailInfo = await transporter.sendMail({
                from: "codecrafters80@gmail.com",
                to: voter.email,
                subject: `Vote Now: ${getElection?.title}`,
                html: `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Email Template</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                            border-radius: 15px;
                        }
  
                        @media only screen and (max-width: 576px) {
                            body {
                                width: 100% !important;
                            }
                        }
  
                        @media only screen and (max-width: 376px) {
                            body {
                                width: 100% !important;
                            }
                        }
                    </style>
                </head>
                <body style="margin: 0 auto;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            <td align="center" style="padding: 20px 0;">
                                <img src="https://i.ibb.co/J2k86ts/logo.png" alt="Company Logo" width="150">
                            </td>
                        </tr>
                        <tr>
                            <td bgcolor="#f0fdf4" style="padding: 40px 20px; color: black;line-height:20px">
                                <h3>You are cordially invited to cast your vote in the upcoming ${getElection?.title} election - ${getElection?.organization}.</h3>
                                <p>Hello,</p>
                                <p style="color: black">We are employing a sophisticated online voting system to ensure accuracy and transparency. You have been allocated a unique voting key, granting you one-time access to this process. Please treat this key with confidentiality and avoid sharing or forwarding this communication.</p>
                                <p>Should you have any queries or wish to share feedback regarding the election, or if you prefer not to receive subsequent voting notifications, please contact ${getElection?.email}</p>
  
                                <p style="padding-bottom: 10px">you will need to enter the access key and password to vote. Don't share it with anybody</p>
                                <p style="font-weight:700">Access Key: ${voter.accessKey}</p>
                                <p style="font-weight:700">Password: ${voter.password}</p>
  
                  <p style="font-weight:700">Your voting link is: https://electrapoll-64bc7.web.app/vote?email=${voter.email}&&id=${getElection._id} </p>
                                <hr />
  
                                <p>Thank you for your participation.</p>
                            </td>
                        </tr>
                        <tr>
                            <td bgcolor="#f4f4f4" style="text-align: center; padding: 10px 0;">
                                <p>&copy; 2023 Electro Poll. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `,
              });
            } catch (error) {
              console.error("Error sending email:", error);
            }
          }
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating election:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });


    // single election get
    app.get("/election/:id", async (req, res) => {
      const id = req.params.id;
      if (id) {
        const result = await electionCollection.findOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      }
    });

    // ==========single election for voting page query checked by voter email======
    app.get("/election-voterCheck", async (req, res) => {
      const id = req.query.id;
      const email = req.query.email;
      const election = await electionCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!election) {
        res.send({ removedElection: true });
      } else {
        const voter = election?.voterEmails?.find((v) => v.email === email);

        if (voter) {
          res.send({
            isVoter: true,
            adminEmail: election.adminEmail,
            voter,
            ballotAccess: election.ballotAccess,
          });
        }
      }
    });

    // ======send election Data after checking accesskey and password======
    app.patch("/election-access-password", async (req, res) => {
      const accesskey = req.body.accessKey;
      const password = req.body.password;
      const email = req.body.email;
      const id = req.body.id;

      const election = await electionCollection.findOne({
        _id: new ObjectId(id),
      });

      const voter = election.voterEmails.find((voter) => voter.email === email);
      if (voter.accessKey === accesskey && voter.password === password) {
        res.send(election);
      } else {
        res.send({ error: true, message: "wrong access key or password" });
      }
    });

    // =================get all election per company==============
    app.get("/all-elections/:email", async (req, res) => {
      const { email } = req.params;
      console.log(email)
      const query = { email: email };
      const result = await electionCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/all-elections/admin/:email", async (req, res) => {
      const { email } = req.params;
      const user = await userCollection.findOne({ email: email });
      console.log(user)
      if (!user || user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. You are not an admin." });
      }
      const result = await electionCollection.find().toArray();
      res.send(result);
    });

    app.get("/election-by-published/:email", async (req, res) => {
      const { email } = req.params; // Get the current date

      // Find elections starting after the current date
      const query = {
        email: email,
        status: "published",
      };

      const result = await electionCollection.find(query).toArray();
      res.send(result);
    });
    
    app.get("/election-by-ongoing/:email", async (req, res) => {
      const { email } = req.params;// Get the current date

    // Find elections starting after the current date
    const query = {
      email: email,
      status:'ongoing',
    };

      const result = await electionCollection.find(query).toArray();
      res.send(result);
    });
    

    app.get("/election-by-completed/:email", async (req, res) => {
      const { email } = req.params;// Get the current date

    // Find elections starting after the current date
    const query = {
      email: email,
      status:'completed',
    };

      const result = await electionCollection.find(query).toArray();
      res.send(result);
    });


    app.get("/elections", async (req, res) => {
      const { email } = req.query;
      const { status } = req.query;
      // console.log(status);
      // console.log(email);

      // Query to fetch data for the specified email
      const emailQuery = { email };
      const emailData = await electionCollection.find(emailQuery).toArray();
      // Query to filter emailData based on status
      let filteredData = emailData;
      if (status) {
        filteredData = emailData.filter((item) => item.status === status);
      }

      res.send(filteredData);
    });

    app.put("/election-vote-update/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      // console.log(body.value);
      const updateDoc = {
        $set: {
          questions: body.value,
          voterEmails: body.voterEmails,
        },
      };
      const result = await electionCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // ===============delete election==============
    app.patch("/remove-election/:id", async (req, res) => {
      const id = req.params.id;
      const result = await electionCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // ===============================website data to exelsheet api start===============

    app.get("/download-election-data/:id", async (req, res) => {
      const id = req.params.id;
      // find election result first
      const query = { _id: new ObjectId(id) };
      const electionResult = await electionCollection.findOne(query);
      console.log(electionResult);

      if (electionResult) {
        const questionsData = electionResult.questions;

        const wb = xlsx.utils.book_new();

        const rows = [];
        questionsData.forEach((question, qIndex) => {
          question.options.forEach((option, index) => {
            rows.push({
              "Question Title": index > 0 ? '"' : question.questionTitle,
              Option: option.option,
              Votes: option.votes,
            });
          });
        });

        const ws = xlsx.utils.json_to_sheet(rows);
        xlsx.utils.book_append_sheet(wb, ws, "QuestionOptions");

        const excelBuffer = xlsx.write(wb, {
          bookType: "xlsx",
          type: "buffer",
        });

        res.setHeader(
          "Content-Disposition",
          "attachment; filename=question_options_output.xlsx"
        );
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.send(excelBuffer);
      }
    });
    // ===============================website data to exelsheet api end===============

    // ===============blogs==============
    app.get("/blogs", async (req, res) => {
      const result = await blogCollection.find({}).sort({ date: -1 }).toArray();
      res.send(result);
    });

    app.get("/getBlog", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await blogCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.findOne(query);
      res.send(result);
    });

    app.delete("/blogDelete/:id", async (req, res) => {
      const id = req.params.id;
      const result = await blogCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.post("/blog", async (req, res) => {
      const blog = req.body;
      const result = await blogCollection.insertOne(blog);

      // notifications function
      if (result) {
        const objectID = result.insertedId;
        const _id = objectID.toHexString();
        // Fetch all user IDs (you should have a 'users' collection in your database)
        const users = await userCollection.find().toArray();
        // Create a notification for each user
        const notifications = users.map((user) => ({
          userId: user._id,
          userEmail: user.email,
          message: `New blog post '${blog.title}' by ElectraPoll is published!`,
          timestamp: new Date(),
          contentURL: `/singleBlog/${_id}`,
          isRead: false,
        }));
        // Insert notifications for all users
        await notificationCollection.insertMany(notifications);
      }

      res.send(result);
    });
    app.get("/recentBlog", async (req, res) => {
      const query = { status: "recent" };
      const result = await blogCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    app.post("/comment", async (req, res) => {
      const id = req.query.id;
      const body = req.body;
      body.blogId = id;
      const filter = { _id: id };

      const result = await commentCollection.insertOne(body);
      res.send(result);
      if (result) {
        const findBlog = await blogCollection.findOne(filter);
        const notification = {
          userEmail: findBlog?.email,
          message: `${findBlog?.comment?.username} comments on your post: ${findBlog?.title} `,
          timestamp: new Date(),
          contentURL: `/singleBlog/${id}`,
          isRead: false,
        };

        await notificationCollection.insertOne(notification);
      }
    });

    app.get("/comment/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {
        blogId: id,
      };
      const result = await commentCollection.find(filter).toArray();
      res.send(result);
    });
    app.post("/reply", async (req, res) => {
      const reply = req.body;
      const result = await replyCollection.insertOne(reply);
      res.send(result);
    });

    app.get("/reply/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {
        blogId: id,
      };
      const result = await replyCollection.find(filter).toArray();
      res.send(result);
    });
    app.delete("/deleteComment/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const commentDeletionResult = await commentCollection.deleteOne(filter);

        if (commentDeletionResult.deletedCount === 1) {
          const deleteReplyResult = await replyCollection.deleteOne({
            commentId: id,
          });
          res
            .status(200)
            .json({ success: true, message: "Comment and replies deleted" });
        } else {
          res
            .status(404)
            .json({ success: false, message: "Comment not found" });
        }
      } catch (error) {
        console.error("Error deleting comment:", error);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });

    // app.post("/comment/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const comment = req.body;
    //   const filter = { _id: new ObjectId(id) };
    //   const updateComment = {
    //     $push: {
    //       comments: comment,
    //     },
    //   };
    //   console.log(comment);
    //   const result = await blogCollection.updateOne(filter, updateComment);
    //   res.send(result);

    //   // notification function
    //   if (result) {
    //     const findBlog = await blogCollection.findOne(filter);

    //     const notification = {
    //       userEmail: findBlog.email,
    //       message: `${comment.username} comments on your post: ${findBlog.title} `,
    //       timestamp: new Date(),
    //       contentURL: `/singleBlog/${id}`,
    //       isRead: false,
    //     };

    //     await notificationCollection.insertOne(notification);
    //   }
    // });

    // ======================notification related apis start============================

    // get all notification by user email
    app.get("/notifications/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };

      const result = await notificationCollection
        .find(query)
        .sort({ timestamp: -1 })
        .toArray();

      res.send(result);
    });

    // update notification read true
    app.patch("/notifications/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          isRead: true,
        },
      };

      const result = await notificationCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // delete a notification
    app.delete("/notifications/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await notificationCollection.deleteOne(query);
      res.send(result);
    });
    // ======================notification related apis end============================

    // ====================== user-review related apis start ==========================
    // post user-reviews data
    app.post("/user-review", async (req, res) => {
      const body = req.body;
      const result = await reviewCollection.insertOne(body);
      res.send(result);
    });

    // get user-reviews data
    app.get("/user-review", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // ====================== user-review related apis end ============================

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

// =====================================chatbot apis start=======================

// Handle incoming messages
app.post("/send-message", async (req, res) => {
  const { message } = req.body;

  const sessionPath = sessionClient.sessionPath(
    "electrapollagent-uxap",
    sessionID
  );

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
        languageCode: "en-US",
      },
    },
  };

  try {
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;
    const botResponse = result.fulfillmentText;

    if (message == "Welcome Message") {
      res.json({
        response:
          "Welcome to our website! I am ElectraPoll Agent. How can I assist you?",
      });
      // console.log({ message });
    } else {
      res.json({ response: botResponse });
    }
  } catch (error) {
    console.error("Error sending message to Dialogflow:", error);
    res.status(500).json({ error: "An error occurred." });
  }
});

// ================================chatbot apis end=================================

// =============================handle elelction status based on starttime endtime============================
setInterval(() => {
  checkStatus();
}, 20000);

async function checkStatus() {
  function getOffset(timeZone) {
    return parseInt(timeZone.replace("UTC", ""), 10);
  }
  // Find elections that are 'published' and should now be 'ongoing'
  const toBeOngoing = await electionCollection
    .find({
      status: "published",
    })
    .toArray();
  // Update these elections to 'ongoing'
  for (let election of toBeOngoing) {
    const currentTimeAdjusted = moment
      .utc()
      .add(getOffset(election.timeZone), "hours");
    if (moment(election.startDate).isSameOrBefore(currentTimeAdjusted)) {
      await electionCollection.updateOne(
        { _id: new ObjectId(election._id) },
        { $set: { status: "ongoing" } }
      );

      const timestamp = new Date().toISOString();

      // send notificaiton of status change
      const _id = election._id.toHexString();
      console.log(_id);
      const notifications = {
        userEmail: election.email,
        message: `Election '${election.title}' started`,
        timestamp,
        contentURL: `/election/${_id}`,
        isRead: false,
      };
      console.log("status chnaged", notifications);

      await notificationCollection.insertOne(notifications);
    }
  }

  // Find elections that are 'ongoing' and should now be 'completed'
  const toBeCompleted = await electionCollection
    .find({
      status: "ongoing",
    })
    .toArray();
  // Update these elections to 'completed'
  for (let election of toBeCompleted) {
    const currentTimeAdjusted = moment
      .utc()
      .add(getOffset(election.timeZone), "hours");
    if (moment(election.endDate).isSameOrBefore(currentTimeAdjusted)) {
      await electionCollection.updateOne(
        { _id: new ObjectId(election._id) },
        { $set: { status: "completed" } }
      );

      const timestamp = new Date().toISOString();
      // send notificaiton of status change
      const _id = election._id.toHexString();
      const notifications = {
        userEmail: election.email,
        message: `Election '${election.title}' ended`,
        timestamp,
        contentURL: `/election/${_id}`,
        isRead: false,
      };
      console.log("status chnaged", notifications);

      await notificationCollection.insertOne(notifications);
    }
  }
}

app.get("/", (req, res) => {
  res.send("Welcome to ElectraPoll Server");
});

app.listen(port, () => {
  console.log(`ElectraPoll server is running on port: ${port}`);
});
run().catch(console.dir);
