//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const dotenv = require("dotenv");
dotenv.config();
const initializeDatabase = require("./config/db");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const mongoose = require("mongoose");
const{model, Schema} = mongoose;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const md5 = require("md5")  Level 2 Hash method
// const bcrypt = require("bcrypt");
// const saltRounds = 10; Level 3 slating + Hash

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended:true
}));

app.use(session({
    secret: "our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

initializeDatabase();


const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//LEVEL 1 Security Cipher method
// const secret = process.env.SECRET;
// userSchema.plugin(encrypt,{secret:secret, encryptedFields:["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser((user,done)=>{
    done(null,user.id);
});

passport.deserializeUser((id,done)=>{
    User.findById(id, (err,user)=>{
        done(err,user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL:"https://localhost:3000/auth/google/secrets",
    userProfileURL:"https//www.googleeapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
        User.findOrCreate({googleId: profile.id}, (err,user)=>{
            return cb(err, user);
        });
}
));

app.get("/", (req,res)=>{
    res.render("home");
});
app.get("/auth/google",
    passport.authenticate("google", {scope: ["profile"]})
);
app.get("auth/google/secrts", passport.authenticate("google", {failureRedirect:"/login"}),(req,res)=>{
    res.redirect("/secrets");
})
app.get("/login", (req,res)=>{
    res.render("login");
});
app.get("/register", (req,res)=>{
    res.render("register");
});
app.get("/secrets", (req,res)=>{
    if(req.isAuthenticated()){
        res.render("secrets");
    }else{
        res.redirect("/login");  
    }
});
app.get("/logout", (req,res)=>{
    req.logout();
    res.redirect("/");
});

app.post("/register",(req,res)=>{

    User.register({username: req.body.username}, req.body.password, (err,user)=>{
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });

    // bcrypt.hash(req.body.password, saltRounds,(err,hash)=>{
    //     if(!err){
    //         const newUser = new User({
    //             email: req.body.username,
    //             password:hash
    //         });
            
    //         newUser.save((err)=>{
    //             if(err){
    //                 console.log(err);
    //             }else{
    //                 res.render("secrets");
    //             }
    //         });
    //     }else{
    //         res.send(err);
    //     }
    // });

    
});

app.post("/login",(req,res)=>{

    const user = new User({
        username: req.body.username,
        password: req.body.username
    });

    req.login(user,(err)=>{
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    })
    // const username = req.body.username;
    // const password = req.body.password;

    // User.findOne({email:username}, (err,foundUser)=>{
    //     if(err){
    //         console.log(err);
    //     }else {
    //         if(foundUser){
    //             bcrypt.compare(password, foundUser.password, (err,result)=>{
    //                 if(result === true){
    //                     res.render("secrets");
    //                 }
    //             });
    //         }else{
    //             console.log("User not found");
    //         }
    //     }
    // });
});








app.get("/health",(req,res)=>{
    res.send("Backend server is active status: Active & Time: "+new Date())
});
const port = process.env.PORT;
const host = process.env.HOST;

app.listen(port,()=>{
    console.log('Express server listening at http://'+host+':'+port);
});