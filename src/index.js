require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
});

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const adminRouter = require('./routes/admin');
app.use('/api/admins', adminRouter);

const profileRouter = require('./routes/profile');
app.use('/api/profile', profileRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
