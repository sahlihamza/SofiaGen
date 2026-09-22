require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const CustomerService = require("../service/CustomerService");
const { signInToken, tokenForVerify } = require("../config/jwt");
const { sendEmail, sendMail } = require("../lib/email-sender/sender");
const {
  customerCredentialsEmailBody,
} = require("../lib/email-sender/templates/customer-credentials");
const {
  customerRegisterBody,
} = require("../lib/email-sender/templates/register");
const {
  forgetPasswordEmailBody,
} = require("../lib/email-sender/templates/forget-password");
const { sendVerificationCode } = require("../lib/phone-verification/sender");
const logger = require("../config/logger");

const verifyEmailAddress = async (req, res) => {
  try {
    const isAdded = await Customer.findOne({ email: req.body.email });
    if (isAdded) {
      return res.status(403).send({
        message: "This Email already Added!",
      });
    } else {
      const token = tokenForVerify(req.body);
      const option = {
        name: req.body.name,
        email: req.body.email,
        token: token,
      };
      const body = {
        from: process.env.EMAIL_USER,
        // from: "info@demomailtrap.com",
        to: `${req.body.email}`,
        subject: "Verify Your Email",
        html: customerRegisterBody(option),
      };

      const message = "Please check your email to verify your account!";
      sendEmail(body, res, message);
    }
  } catch (err) {
    logger.error("Error during email verification:", err);
    res.status(500).send({
      message: err.message,
    });
  }
};

const verifyPhoneNumber = async (req, res) => {
  const phoneNumber = req.body.phone;

  // Check if phone number is provided and is in the correct format
  if (!phoneNumber) {
    return res.status(400).send({
      message: "Phone number is required.",
    });
  }

  // Optional: Add phone number format validation here (if required)
  // const phoneRegex = /^[0-9]{10}$/; // Basic validation for 10-digit phone numbers
  // if (!phoneRegex.test(phoneNumber)) {
  //   return res.status(400).send({
  //     message: "Invalid phone number format. Please provide a valid number.",
  //   });
  // }

  try {
    // Check if the phone number is already associated with an existing customer
    const isAdded = await Customer.findOne({ phone: phoneNumber });

    if (isAdded) {
      return res.status(403).send({
        message: "This phone number is already added.",
      });
    }

    // Generate a random 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Send verification code via SMS
    const sent = await sendVerificationCode(phoneNumber, verificationCode);

    if (!sent) {
      return res.status(500).send({
        message: "Failed to send verification code.",
      });
    }

    const message = "Please check your phone for the verification code!";
    return res.send({ message });
  } catch (err) {
    logger.error("Error during phone verification:", err);
    res.status(500).send({
      message: err.message,
    });
  }
};

const registerCustomer = async (req, res) => {
  const token = req.params.token;

  try {
    const { name, email, password } = jwt.decode(token);

    // Check if the user is already registered
    const isAdded = await Customer.findOne({ email });

    if (isAdded) {
      const token = signInToken(isAdded);
      return res.send({
        token,
        _id: isAdded._id,
        name: isAdded.name,
        email: isAdded.email,
        password: password,
        message: "Email Already Verified!",
      });
    }

    if (token) {
      jwt.verify(
        token,
        process.env.JWT_SECRET_FOR_VERIFY,
        async (err, decoded) => {
          if (err) {
            return res.status(401).send({
              message: "Token Expired, Please try again!",
            });
          }

          // Create a new user only if not already registered
          const existingUser = await Customer.findOne({ email });

          if (existingUser) {
            return res.status(400).send({ message: "User already exists!" });
          } else {
            const newUser = new Customer({
              name,
              email,
              password: bcrypt.hashSync(password),
            });

            await newUser.save();
            const token = signInToken(newUser);
            res.send({
              token,
              _id: newUser._id,
              name: newUser.name,
              email: newUser.email,
              message: "Email Verified, Please Login Now!",
            });
          }
        }
      );
    }
  } catch (error) {
    logger.error("Error during email verification:", error);
    res.status(500).send({
      message: "Internal server error. Please try again later.",
    });
  }
};

const addAllCustomers = async (req, res) => {
  try {
    await Customer.deleteMany();
    await Customer.insertMany(req.body);
    res.send({
      message: "Added all users successfully!",
    });
  } catch (err) {
    logger.error("Error during adding all customers:", err);
    res.status(500).send({
      message: err.message,
    });
  }
};

const loginCustomer = async (req, res) => {
  try {
    // Le modèle enregistre l'e-mail en minuscules : sans la même normalisation
    // ici, un client inscrit avec "John@Ex.com" ne se retrouverait plus au
    // moment de se connecter.
    const customer = await Customer.findOne({
      email: (req.body.email || "").toLowerCase().trim(),
    });

    if (
      customer &&
      customer.password &&
      bcrypt.compareSync(req.body.password, customer.password)
    ) {
      const token = signInToken(customer);
      res.send({
        token,
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        address: customer.address,
        phone: customer.phone,
        image: customer.image,
      });
    } else {
      res.status(401).send({
        message: "Invalid user or password!",
        error: "Invalid user or password!",
      });
    }
  } catch (err) {
    logger.error("Error during customer login:", err);
    res.status(500).send({
      message: err.message,
      error: "Invalid user or password!",
    });
  }
};

const forgetPassword = async (req, res) => {
  try {
    const isAdded = await Customer.findOne({ email: req.body.email });
    if (!isAdded) {
      return res.status(404).send({
        message: "User Not found with this email!",
      });
    } else {
      const token = tokenForVerify(isAdded);
      const option = {
        name: isAdded.name,
        email: isAdded.email,
        token: token,
      };

      const body = {
        from: process.env.EMAIL_USER,
        to: `${req.body.email}`,
        subject: "Password Reset",
        html: forgetPasswordEmailBody(option),
      };

      const message = "Please check your email to reset password!";
      sendEmail(body, res, message);
    }
  } catch (err) {
    logger.error("Error during forget password:", err);
    res.status(500).send({
      message: err.message,
    });
  }
};

const resetPassword = async (req, res) => {
  const token = req.body.token;
  const { email } = jwt.decode(token);
  const customer = await Customer.findOne({ email: email });

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET_FOR_VERIFY, (err, decoded) => {
      if (err) {
        return res.status(500).send({
          message: "Token expired, please try again!",
        });
      } else {
        customer.password = bcrypt.hashSync(req.body.newPassword);
        customer.save();
        res.send({
          message: "Your password change successful, you can login now!",
        });
      }
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const customer = await Customer.findOne({ email: req.body.email });
    if (!customer.password) {
      return res.status(403).send({
        message:
          "For change password,You need to sign up with email & password!",
      });
    } else if (
      customer &&
      bcrypt.compareSync(req.body.currentPassword, customer.password)
    ) {
      customer.password = bcrypt.hashSync(req.body.newPassword);
      await customer.save();
      res.send({
        message: "Your password change successfully!",
      });
    } else {
      res.status(401).send({
        message: "Invalid email or current password!",
      });
    }
  } catch (err) {
    logger.error("Error during password change:", err);
    res.status(500).send({
      message: err.message,
    });
  }
};

const signUpWithProvider = async (req, res) => {
  try {
    // const { user } = jwt.decode(req.body.params);
    const user = jwt.decode(req.params.token);

    const isAdded = await Customer.findOne({ email: user.email });
    if (isAdded) {
      const token = signInToken(isAdded);
      res.send({
        token,
        _id: isAdded._id,
        name: isAdded.name,
        email: isAdded.email,
        address: isAdded.address,
        phone: isAdded.phone,
        image: isAdded.image,
      });
    } else {
      const newUser = new Customer({
        name: user.name,
        email: user.email,
        image: user.picture,
      });

      const signUpCustomer = await newUser.save();
      const token = signInToken(signUpCustomer);
      res.send({
        token,
        _id: signUpCustomer._id,
        name: signUpCustomer.name,
        email: signUpCustomer.email,
        image: signUpCustomer.image,
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const signUpWithOauthProvider = async (req, res) => {
  try {
    const isAdded = await Customer.findOne({ email: req.body.email });
    if (isAdded) {
      const token = signInToken(isAdded);
      res.send({
        token,
        _id: isAdded._id,
        name: isAdded.name,
        email: isAdded.email,
        address: isAdded.address,
        phone: isAdded.phone,
        image: isAdded.image,
      });
    } else {
      const newUser = new Customer({
        name: req.body.name,
        email: req.body.email,
        image: req.body.image,
      });

      const signUpCustomer = await newUser.save();
      const token = signInToken(signUpCustomer);
      res.send({
        token,
        _id: signUpCustomer._id,
        name: signUpCustomer.name,
        email: signUpCustomer.email,
        image: signUpCustomer.image,
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const addCustomer = async (req, res) => {
  try {
    const newCustomer = await CustomerService.createCustomer({ ...req.body, storeId: req.currentStoreId });

    // Credentials email: the plaintext password only exists in this request
    // (the service hashes it before saving), so the mail has to go out here.
    // A failing SMTP must not undo a customer that was created fine, so the
    // error is logged and reported back as emailSent: false.
    let emailSent = false;

    if (req.body.password) {
      try {
        await sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: newCustomer.email,
          subject: "Your account details",
          html: customerCredentialsEmailBody({
            name: newCustomer.name,
            email: newCustomer.email,
            password: req.body.password,
            storeUrl: process.env.STORE_URL,
          }),
        });
        emailSent = true;
      } catch (mailErr) {
        logger.error("Error sending customer credentials email:", mailErr);
      }
    }

    res.send({
      data: newCustomer,
      emailSent,
      message: emailSent
        ? "Customer added successfully and login details sent by email!"
        : "Customer added successfully!",
    });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const result = await CustomerService.getAllCustomers({ ...req.query, storeId: req.currentStoreId });
    res.send(result);
  } catch (err) {
    res.status(err.statusCode || 500).send({ message: err.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await CustomerService.getCustomerById(req.params.id);

    if (!customer) {
      return res.status(404).send({ message: "Customer Not Found!" });
    }

    res.send(customer);
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

// Shipping address create or update
const addShippingAddress = async (req, res) => {
  try {
    const customerId = req.params.id;
    const newShippingAddress = req.body;

    // Find the customer by ID and update the shippingAddress field
    const result = await Customer.updateOne(
      { _id: customerId },
      {
        $set: {
          shippingAddress: newShippingAddress,
        },
      },
      { upsert: true } // Create a new document if no document matches the filter
    );

    if (result.nModified > 0 || result.upserted) {
      return res.send({
        message: "Shipping address added or updated successfully.",
      });
    } else {
      return res.status(404).send({ message: "Customer not found." });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getShippingAddress = async (req, res) => {
  try {
    const customerId = req.params.id;
    // const addressId = req.query.id;

    const customer = await Customer.findById(customerId);
    res.send({ shippingAddress: customer?.shippingAddress });

    // if (addressId) {
    //   // Find the specific address by its ID
    //   const address = customer.shippingAddress.find(
    //     (addr) => addr._id.toString() === addressId.toString()
    //   );

    //   if (!address) {
    //     return res.status(404).send({
    //       message: "Shipping address not found!",
    //     });
    //   }

    //   return res.send({ shippingAddress: address });
    // } else {
    //   res.send({ shippingAddress: customer?.shippingAddress });
    // }
  } catch (err) {
    // logger.error("Error adding shipping address:", err);
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateShippingAddress = async (req, res) => {
  try {
    const activeDB = req.activeDB;

    const Customer = activeDB.model("Customer", CustomerModel);
    const customer = await Customer.findById(req.params.id);

    if (customer) {
      customer.shippingAddress.push(req.body);

      await customer.save();
      res.send({ message: "Success" });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteShippingAddress = async (req, res) => {
  try {
    const activeDB = req.activeDB;
    const { userId, shippingId } = req.params;

    const Customer = activeDB.model("Customer", CustomerModel);
    await Customer.updateOne(
      { _id: userId },
      {
        $pull: {
          shippingAddress: { _id: shippingId },
        },
      }
    );

    res.send({ message: "Shipping Address Deleted Successfully!" });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await CustomerService.updateCustomer(
      req.params.id,
      req.body
    );

    if (!customer) {
      return res.status(404).send({ message: "Customer Not Found!" });
    }

    res.send({ data: customer, message: "Customer updated successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

// Soft delete: the row stays in place with deletedAt set, so it can be restored.
const deleteCustomer = async (req, res) => {
  try {
    const customer = await CustomerService.softDeleteCustomer(req.params.id);

    if (!customer) {
      return res.status(404).send({ message: "Customer Not Found!" });
    }

    res.send({ message: "Customer Deleted Successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const deleteManyCustomers = async (req, res) => {
  try {
    await CustomerService.softDeleteManyCustomers(req.body.ids);
    res.send({ message: "Customers Deleted Successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const restoreCustomer = async (req, res) => {
  try {
    const customer = await CustomerService.restoreCustomer(req.params.id);

    if (!customer) {
      return res.status(404).send({ message: "Deleted Customer Not Found!" });
    }

    res.send({ data: customer, message: "Customer restored successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const blockCustomer = async (req, res) => {
  try {
    const customer = await CustomerService.blockCustomer(req.params.id);

    if (!customer) {
      return res.status(404).send({ message: "Customer Not Found!" });
    }

    res.send({ data: customer, message: "Customer blocked successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const unblockCustomer = async (req, res) => {
  try {
    const customer = await CustomerService.unblockCustomer(req.params.id);

    if (!customer) {
      return res.status(404).send({ message: "Customer Not Found!" });
    }

    res.send({ data: customer, message: "Customer unblocked successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

module.exports = {
  loginCustomer,
  verifyPhoneNumber,
  registerCustomer,
  addAllCustomers,
  signUpWithProvider,
  signUpWithOauthProvider,
  verifyEmailAddress,
  forgetPassword,
  changePassword,
  resetPassword,
  addCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  deleteManyCustomers,
  restoreCustomer,
  blockCustomer,
  unblockCustomer,
  addShippingAddress,
  getShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
};
