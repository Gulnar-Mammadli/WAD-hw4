const express = require("express");
const pool = require("./database");
const cors = require("cors");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 3000;

const app = express();

app.use(cors({ origin: "http://localhost:8080", credentials: true }));

app.use(express.json());
app.use(cookieParser());

const secret = "gdgdhdbcb770785rgdzqws";
const maxAge = 60 * 60;

const generateJWT = (id) => {
  return jwt.sign({ id }, secret, { expiresIn: maxAge });
  //jwt.sign(payload, secret, [options, callback]), and it returns the JWT as string
};

app.listen(port, () => {
  console.log("Server is listening to port " + port);
});

app.get("/auth/authenticate", async (req, res) => {
  console.log("authentication request has been arrived");
  const token = req.cookies.jwt;
  console.log("token " + token);
  let authenticated = false;
  try {
    if (token) {
      await jwt.verify(token, secret, (err) => {
        if (err) {
          console.log(err.message);
          console.log("token is not verified");
          res.send({ authenticated: authenticated });
        } else {
          console.log("author is authinticated");
          authenticated = true;
          res.send({ authenticated: authenticated });
        }
      });
    } else {
      console.log("author is not authinticated");
      res.send({ authenticated: authenticated });
    }
  } catch (err) {
    console.error(err.message);
    res.status(400).send(err.message);
  }
});

app.post("/auth/signup", async (req, res) => {
  try {
    console.log("a signup request has arrived");
    const { email, password } = req.body;

    const salt = await bcrypt.genSalt();
    const bcryptPassword = await bcrypt.hash(password, salt);
    const authUser = await pool.query(
      "INSERT INTO users(email, password) values ($1, $2) RETURNING*",
      [email, bcryptPassword]
    );
    console.log(authUser.rows[0].id);
    const token = await generateJWT(authUser.rows[0].id);
    console.log("token:", token);

    res
      .status(201)
      .cookie("jwt", token, { maxAge: 6000000, httpOnly: true })
      .json({ user_id: authUser.rows[0].id }).send;
  } catch (err) {
    console.error(err.message);
    res.status(400).send(err.message);
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    console.log("a login request has arrived");
    const { email, password } = req.body;
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (user.rows.length === 0)
      return res.status(401).json({ error: "User is not registered" });

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    console.log("validPassword:" + validPassword);
    if (!validPassword)
      return res.status(401).json({ error: "Incorrect password" });

    const token = await generateJWT(user.rows[0].id);
    res
      .status(201)
      .cookie("jwt", token, { maxAge: 6000000, httpOnly: true })
      .json({ user_id: user.rows[0].id }).send;
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.get("/auth/logout", (req, res) => {
  console.log("delete jwt request arrived");
  res.status(202).clearCookie("jwt").json({ Msg: "cookie cleared" }).send;
});
