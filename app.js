const express = require('express');
const app = express();
const path = require('path');
const userModel = require('./modules/user');
const postModel = require('./modules/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const upload = require('./config/multerconfig')


app.set('view engine', 'ejs');
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser())


app.get('/', function (req, res) {
    res.render('home');
});

app.get('/like/:id', isLoggedIn, async function (req, res) {
    let post = await postModel.findOne({ _id: req.params.id }).populate('user');

    if (post.like.indexOf(post.user._id) === -1) {
        post.like.push(post.user._id);

    } else {
        post.like.splice(post.like.indexOf(post.user._id), 1)
    }
    await post.save();
    res.redirect('/profile');
})

app.post('/create', function (req, res) {
    const { name, username, email, password, age } = req.body;
    bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, async function (err, hash) {
            const user = await userModel.create({
                name,
                username,
                email,
                password: hash,
                age
            })
            res.redirect('/profile');
        })
    })

    const token = jwt.sign({ email }, 'secret')
    res.cookie('token', token);
});

app.get('/logout', function (req, res) {
    res.cookie('token', '');
    res.redirect('/login');
})

app.get('/login', function (req, res) {
    res.render('login');
})

app.post('/post', isLoggedIn, upload.single('image'), async function (req, res) {
    const user = await userModel.findOne({ email: req.user.email })
    const { content } = req.body;
    console.log(user);
    const post = await postModel.create({
        user: user._id,
        content,
        image: req.file.filename
    })
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
})

app.post('/login', async function (req, res) {
    const user = await userModel.findOne({ email: req.body.email })

    if (!user) {
        res.send('You are not registerd! please Sign up first')
    } else {

        bcrypt.compare(req.body.password, user.password, function (err, result) {
            if (!result) {
                res.send('not match!')
            } else {
                const token = jwt.sign({ email: req.body.email }, 'secret')

                res.cookie('token', token);
                res.redirect('/profile')
            }
        });
        console.log(user)
    }

})

app.get('/profile', isLoggedIn, async function (req, res) {
    const user = await userModel.findOne({ email: req.user.email }).populate('posts')
    console.log(user);
    res.render('profile', { user });
    // console.log(req.cookies);
});

function isLoggedIn(req, res, next) {
    if (req.cookies.token === '') {
        res.redirect('/login');
    }
    else {

        let data = jwt.verify(req.cookies.token, 'secret');
        req.user = data;
        next()
    }
}

app.listen(3000, () => {
    console.log('running');
});