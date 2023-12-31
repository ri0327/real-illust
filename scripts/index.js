const Jimp = require('jimp');
const { ClarifaiStub, grpc } = require("clarifai-nodejs-grpc");
const fs = require("fs");

const metadata = new grpc.Metadata();
const api_key = "7a292b092fda4d9daab379391441efc5";
metadata.set("authorization", "Key " + api_key);

let result = [];

const onfile = async (res, file) => {
  const path = await new Promise((resolve) => {
    res.download(file, resolve);
  });

  const ext = file.name.slice(-4);
  const image = await Jimp.read(path);
  const newFileName = Math.random().toString(32).substring(2) + ext;

  await new Promise((resolve) => {
    image.write('images/' + newFileName, (err) => {
      resolve();
    });
  });

  await sendtoClarifai(newFileName);

  res.send([
    'data received.',
    `${result[0]}`,
    `${result[1]}`
  ].join('\n'));
};

const sendtoClarifai = (nFN) => {
  return new Promise((resolve) => {
    const imageBytes = fs.readFileSync("images/" + nFN, { encoding: "base64" });
    const stub = ClarifaiStub.grpc();

    stub.PostModelOutputs(
      {
        model_id: "real-illust-model",
        inputs: [{ data: { image: { base64: imageBytes } } }]
      },
      metadata,
      (err, response) => {
        if (err) {
          console.log("Error: " + err);
          return;
        }

        if (response.status.code !== 10000) {
          console.log("Received failed status: " + response.status.description + "\n" + response.status.details + "\n" + response.status.code);
          return;
        }

        console.log("Predicted concepts, with confidence values:");
        for (let i = 0; i < response.outputs[0].data.concepts.length; i++) {
          const c = response.outputs[0].data.concepts[i];
          console.log(c.name + ": " + c.value.toFixed(4));
          result[i] = c.name + ": " + c.value.toFixed(4);
        }

        resolve();
      }
    );
  });
};

module.exports = (robot) => {
  robot.respond('file', (res) => {
    onfile(res, res.json);
  });
};
