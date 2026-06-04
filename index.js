const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = 'Chamas-te Lena. Es a assistente virtual da Fotoedsons Photography, estudio fotografico em Cabo Verde. Respondes pelo WhatsApp de forma calorosa e profissional. PRECOS: Sessao fotografica individual ou familiar: 650$00. Fotografia de produto: 180$00. Para marcacoes pede nome, data e tipo de sessao. Se nao souberes algo diz que vais verificar com o Edson. Nao empurres pacotes extras.';

app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
          res.status(200).send(challenge);
    } else {
          res.sendStatus(403);
    }
});

app.post("/webhook", async (req, res) => {
    try {
          const body = req.body;
          if (body.object === "whatsapp_business_account") {
                  for (const entry of body.entry || []) {
                            for (const change of entry.changes || []) {
                                        const value = change.value;
                                        if (!value || !value.messages) continue;
                                        for (const message of value.messages) {
                                                      if (message.type !== "text") continue;
                                                      const from = message.from;
                                                      const text = message.text.body;
                                                      const phoneNumberId = value.metadata.phone_number_id;

                                          const geminiRes = await axios.post(
                                                          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY,
                                            {
                                                              system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                                                              contents: [{ role: "user", parts: [{ text: text }] }]
                                            }
                                                        );

                                          const reply = geminiRes.data.candidates[0].content.parts[0].text;

                                          await axios.post(
                                                          "https://graph.facebook.com/v19.0/" + phoneNumberId + "/messages",
                                            { messaging_product: "whatsapp", to: from, type: "text", text: { body: reply } },
                                            { headers: { Authorization: "Bearer " + WHATSAPP_TOKEN, "Content-Type": "application/json" } }
                                                        );
                                        }
                            }
                  }
          }
          res.sendStatus(200);
    } catch (err) {
          console.error("Erro:", err.message);
          res.sendStatus(500);
    }
});

app.get("/", (req, res) => { res.send("Lena esta online!"); });

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => { console.log("Porta " + PORT); });
