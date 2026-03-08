const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: 'RoomRental Support <no-reply@roomrental.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
