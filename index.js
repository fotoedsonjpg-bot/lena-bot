const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

const SYSTEM_PROMPT = 'Chamas-te Lena. Es a assistente virtual da Fotoedsons Photography, estudio fotografico em Cabo Verde. Respondes pelo WhatsApp de forma calorosa e profissional. PRECOS: Sessao fotografica individual ou familiar: 650$00. Fotografia de produto: 180$00. Para marcacoes pede nome, data e tipo de sessao. Se nao souberes algo diz que vais verificar com o Edson.';

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
                                                                                                                                      const response = await anthropic.messages.create({
                                                                                                                                                    model: "claude-haiku-4-5",
                                                                                                                                                                  max_tokens: 500,
                                                                                                                                                                                system: SYSTEM_PROMPT,
                                                                                                                                                                                              messages: [{ role: "user", content: text }]
                                                                                                                                                                                                          });
                                                                                                                                                                                                                      const reply = response.content[0].text;
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
                                                                                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                                                                                    const PORT = process.env.PORT || 3000;
                                                                                                                                                                                                                                                                                                                                    app.listen(PORT, () => { console.log("Porta " + PORT); });
