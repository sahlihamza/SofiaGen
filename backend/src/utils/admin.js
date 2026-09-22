const bcrypt = require("bcryptjs");

const ROLE = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  CEO: "CEO",
  MANAGER: "Manager",
  ACCOUNTANT: "Accountant",
  CASHIER: "Cashier",
  SECURITY_GUARD: "Security Guard",
  DRIVER: "Driver",
};

const admins = [
  {
    name: "Dorothy R. Brown",
    image: "https://i.ibb.co/d294W8Y/team-4.jpg",
    email: "dorothy@gmail.com",
    password: bcrypt.hashSync("12345678"),
    phone: "25634598",
    role: [ROLE.SECURITY_GUARD],
    joiningData: new Date(),
  },
  {
    name: "Alice B. Porter",
    image: "https://i.ibb.co/m5B0hK4/team-8.jpg",
    email: "alice@gmail.com",
    password: bcrypt.hashSync("12345678"),
    phone: "24634598",
    role: [ROLE.CASHIER],
    joiningData: new Date(),
  },
  {
    name: "Corrie H. Cates",
    image: "https://i.ibb.co/SNN7JCX/team-6.jpg",
    email: "corrie@gmail.com",
    password: bcrypt.hashSync("12345678"),
    phone: "25636598",
    role: [ROLE.ACCOUNTANT],
    joiningData: new Date(),
  },
  {
    name: "Shawn E. Palmer",
    image: "https://i.ibb.co/GWVWYNn/team-7.jpg",
    email: "shawn@gmail.com",
    password: bcrypt.hashSync("12345678"),
    phone: "25634498",
    role: [ROLE.MANAGER],
    joiningData: new Date(),
  },
  {
    name: "Stacey J. Meikle",
    image: "https://i.ibb.co/XjwBLcK/team-2.jpg",
    email: "stacey@gmail.com",
    password: bcrypt.hashSync("12345678"),
    phone: "25334598",
    role: [ROLE.CEO],
    joiningData: new Date(),
  },
  {
    name: "Marion V. Parker",
    image: "https://i.ibb.co/3zs3H7z/team-5.jpg",
    email: "marion@gmail.com",
    password: bcrypt.hashSync("12345678"),
    phone: "25637598",
    role: [ROLE.ADMIN],
    joiningData: new Date(),
  },
  {
    name: "Admin",
    image: "https://i.ibb.co/WpM5yZZ/9.png",
    email: "admin@gmail.com",
    password: bcrypt.hashSync("12345678"),
    phone: "25634594",
    role: [ROLE.SUPER_ADMIN],
    joiningData: new Date(),
  },
];

module.exports = admins;
