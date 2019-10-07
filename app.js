var express = require("express");
var app=express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var flash = require("connect-flash");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var methodOverride = require("method-override");
var Campground=require("./models/campground");
var Comment = require("./models/comment");
var User = require("./models/user");
// var seedDB = require("./seed");


mongoose.set('useNewUrlParser', true);
var url = process.env.DATABASEURL || "mongodb://localhost/camp";
mongoose.connect(url);
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine","ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

 // seedDB();

app.use(require("express-session")({
    secret: "Rusty is the best and cutest dog in the world",
    resave: false,
    saveUninitialized: false
}));
app.locals.moment = require('moment');
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
	res.locals.currentuser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});



// Campground.create(
//     {
//         name: "Granite Hill", 
//         image: "https://farm1.staticflickr.com/60/215827008_6489cd30c3.jpg",
//         description: "This is a huge granite hill.No water.beautiful hills."
        
//     },function(err,campground){
//         if(err){
//             console.log(err);
//         }else
//         console.log("newly created campground");
//         console.log(campground);
//     });

//  var campground = [
//         {name: "Salmon Creek", image: "https://farm9.staticflickr.com/8442/7962474612_bf2baf67c0.jpg"},
//         {name: "Granite Hill", image: "https://farm1.staticflickr.com/60/215827008_6489cd30c3.jpg"},
//         {name: "Mountain Goat's Rest", image: "https://farm7.staticflickr.com/6057/6234565071_4d20668bbd.jpg"},
//         {name: "Salmon Creek", image: "https://farm9.staticflickr.com/8442/7962474612_bf2baf67c0.jpg"},
//         {name: "Granite Hill", image: "https://farm1.staticflickr.com/60/215827008_6489cd30c3.jpg"},
//         {name: "Mountain Goat's Rest", image: "https://farm7.staticflickr.com/6057/6234565071_4d20668bbd.jpg"},
//         {name: "Salmon Creek", image: "https://farm9.staticflickr.com/8442/7962474612_bf2baf67c0.jpg"},
//         {name: "Granite Hill", image: "https://farm1.staticflickr.com/60/215827008_6489cd30c3.jpg"},
//         {name: "Mountain Goat's Rest", image: "https://farm7.staticflickr.com/6057/6234565071_4d20668bbd.jpg"}
// ];
app.get("/",function(req,res){
    res.render("landing");
});

app.get("/campground",function(req,res){
    Campground.find({},function(err,allcampground){
        if(err){
            console.log(err);
        }else
        {
             res.render("index",{campground: allcampground, currentuser: req.user});
        }
    });
});
app.post("/campground", isLoggedIn,function(req, res){
   
    var name = req.body.name;
    var image = req.body.image;
    var desc = req.body.description;
	var author = {
		id: req.user._id,
		username: req.user.username
	};
    var newCampground = {name: name, image: image,description: desc, author: author};
    Campground.create(newCampground,function(err,newlycreated){
        if(err){
            console.log(err);
        }else
         res.redirect("/campground");
    });
});
app.get("/campground/new",isLoggedIn,function(req, res) {
    res.render("new");
});
app.get("/campground/:id",function(req, res) {
    Campground.findById(req.params.id).populate("comments likes").exec(function(err, foundcampground){
        if(err){
            console.log(err);
        }else{
            res.render("show", {campground: foundcampground});
        }
    });
});

app.get("/campground/:id/edit", checkCampgroundOwner, function(req, res){
		Campground.findById(req.params.id, function(err, foundcampground){
	   res.render("edit",  {campground: foundcampground});
  });
});

app.put("/campground/:id", checkCampgroundOwner,  function(req, res){
	Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedcampground){
		if(err){
			console.log(err);
			res.redirect("/campground");
		}else{
			res.redirect("/campground/" + req.params.id);
		}
	});
});
// Campground Like Route
app.post("/campground/:id/like",isLoggedIn, function (req, res) {
		Campground.findById(req.params.id, function (err, foundCampground) {
		if (err) {
		console.log(err);
		return res.redirect("/campground");
		}

		// check if req.user._id exists in foundCampground.likes
		var foundUserLike = foundCampground.likes.some(function (like) {
		return like.equals(req.user._id);
		});

		if (foundUserLike) {
		// user already liked, removing like
		foundCampground.likes.pull(req.user._id);
		} else {
		// adding the new user like
		foundCampground.likes.push(req.user);
		}
		foundCampground.save(function (err) {
		if (err) {
		console.log(err);
		return res.redirect("/campground");
		}
		return res.redirect("/campground/" + foundCampground._id);
		
		});
		});
});



//============destroy
app.delete("/campground/:id", checkCampgroundOwner, function(req, res){
	Campground.findByIdAndRemove(req.params.id, function(err){
		if(err){
			res.redirect("/campground");
		}else{
			res.redirect("/campground");
		}
	});
});
//==comments=================

app.get("/campground/:id/comments/new",isLoggedIn, function(req, res){
	Campground.findById(req.params.id, function(err, campground){
		if(err){
			console.log(err);
		}else{
			res.render("comments/new",{campground: campground});
		}
	});
	
});
app.post("/campground/:id/comments", isLoggedIn, function(req, res){
	Campground.findById(req.params.id, function(err, campground){
		if(err){
			console.log(err);
			res.redirect("/campground");
		}else{
			Comment.create(req.body.comment, function(err, comment){
				if(err){
					req.flash("error", "Something went wrong");
					console.log(err);
				}else{
					comment.author.id = req.user._id;
					comment.author.username = req.user.username;
					comment.save();
					campground.comments.push(comment);
					campground.save();
					req.flash("success", "Comment added Successfully ");
					res.redirect("/campground/" + campground._id);
				}
			});
		}
	});	
});
app.get("/campground/:id/comments/:commentid/editcomment", checkCommentOwnership, function(req, res){
	Comment.findById(req.params.commentid, function(err, foundcomment){
		if(err){
			console.log(err);
			res.redirect("back");
		}else{
			res.render("comments/editcomment", {campground_id: req.params.id, comment: foundcomment});
		}
	});
});
app.put("/campground/:id/comments/:commentid", checkCommentOwnership, function(req,res){
	Comment.findByIdAndUpdate(req.params.commentid, req.body.comment, function(err, updatedcomment){
		if(err){
			res.redirect("back");
		}else{
			res.redirect("/campground/"+ req.params.id);
		}
	});
});

app.delete("/campground/:id/comments/:commentid", checkCommentOwnership,function(req, res){
	
	Comment.findByIdAndRemove(req.params.commentid, function(err){
		if(err){
			res.redirect("back");
		}else{
			req.flash("success", "Comment Deleted");
			res.redirect("/campground/"+ req.params.id);
		}
	});
});
app.get("/register", function(req, res){
	res.render("register");
});
app.post("/register", function(req, res){
    User.register(new User({username: req.body.username}), req.body.password, function(err, user){
        if(err){
            console.log(err);
			// req.flash("error", err.message);
            return res.render("register", {error: err.message});
        }
        passport.authenticate("local")(req, res, function(){
		 req.flash("success", "Welcome " + user.username); 
         res.redirect("/campground");
        });
    });
});

app.get("/login", function(req, res){
	res.render("login");
});

app.post("/login",passport.authenticate("local",{
	successRedirect: "/campground",
	failureRedirect: "/login"
}) ,function(req, res){
	
});

app.get("/logout", function(req, res){
	req.logout();
	req.flash("success", "Logged you out!");
	res.redirect("/campground");
});

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
	req.flash("error", "You need to be logged in to do that!");
    res.redirect("/login");
}

function checkCampgroundOwner(req, res, next){
	if(req.isAuthenticated()){
        Campground.findById(req.params.id, function(err, foundCampground){
           if(err || !foundCampground) {
               req.flash("error", "Campground not found");
               res.redirect("back");
           }  else {
               // does user own the campground?
            if(foundCampground.author.id.equals(req.user._id)) {
                next();
            } else {
                req.flash("error", "You don't have permission to do that");
                res.redirect("back");
            }
           }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}

function checkCommentOwnership(req, res, next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.commentid, function(err, foundcomment){
		if(err || !foundcomment) {
			req.flash("error", "campground not found!");
			console.log(err);
			res.redirect("back");
		}else{
			if(foundcomment.author.id.equals(req.user._id)){
				next();
			}else{
				req.flash("error", "You don't have permission to do that!");
				res.redirect("/campground/"+ req.params.id);
			}
		}
	});
	}else{
		req.flash("error", "You need to be logged in to do that!");
		res.redirect("back");
	}	
}

// app.listen(process.env.PORT, process.env.IP);

app.listen(3000, () => {
    console.log("SERVER IS RUNNING!");
});

