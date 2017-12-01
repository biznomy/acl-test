require('dotenv').config()
const express = require('express')
// const fs = require('fs')
const path = require('path')
const logger = require('morgan')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const ACL = require('acl')

// load user.json file
// const d = fs.readFileSync(path.join(__dirname, '/../data/user.json'))
// const userObj = JSON.parse(d)
const userObj = [{
    id: 1,
    username: 'admin',
    password: 'admin',
    email: 'admin@admin.com',
    role: 'admin',
},
{
    id: 2,
    username: 'user',
    password: 'user',
    email: 'user@user.com',
    role: 'user',
},
]

const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')
app.use(logger(process.env.LOG_ENV))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: false,
}))
app.use(express.static(path.join(__dirname, '/../public')))
app.use(cookieParser())

app.use(session({
    secret: 'super-mega-hyper-secret',
    resave: false,
    saveUninitialized: false,
}))



function authenticate() {
    passport.serializeUser((user, done) => {
        done(null, user.id)
    })

    passport.deserializeUser((id, done) => {
        //        const user = await serviceAuth.findById(id)
        const user = userObj.find(item => item.id === id)
        done(null, user)
    })

    // Sign in with username and Password
    passport.use('local', new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password'
    }, async (username, password, done) => {
        const user = userObj.find(item => item.username === username)
        done(null, user)
    }))
}

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        res.locals.user = req.session.user
        return next()
    }
    res.redirect('login')
}
authenticate()


/**
 * Passport Local
 */
app.use(passport.initialize())
app.use(passport.session())

/**
 * Node ACL
 */

function accessControl() {
    const nodeAcl = new ACL(new ACL.memoryBackend())

    nodeAcl.allow([{
        roles: 'admin',
        allows: [{
            resources: '/admin',
            permissions: '*',
        }],
    }, {
        roles: 'user',
        allows: [{
            resources: '/dashboard',
            permissions: 'get',
        }],
    }, {
        roles: 'guest',
        allows: [],
    }])

    // Inherit roles
    //  Every user is allowed to do what guests do
    //  Every admin is allowed to do what users do
    nodeAcl.addRoleParents('user', 'guest')
    nodeAcl.addRoleParents('admin', 'user')

    nodeAcl.addUserRoles(1, 'admin')
    nodeAcl.addUserRoles(2, 'user')
    nodeAcl.addUserRoles(0, 'guest')
    setTimeout(function () {
        nodeAcl.roleUsers('user', function (err, users) {
            console.log(users)
        })
        nodeAcl.roleUsers('admin', function (err, users) {
            console.log(users)
        })
    }, 3000)
    return nodeAcl
}

/*
function checkPermission(resource, action) {
  const access = accessControl()

  return (req, res, next) => {
    const uid = req.session.user.id
    access.isAllowed(uid, resource, action, (err, result) => {
      if (result) {
        next()
      } else {
        const checkError = new Error('User does not have permission to perform this action on this resource')
        next(checkError)
      }
    })
  }
} */

const getCurrentUserId = (req) => {
    console.log(req)
    req.user && req.user.id.toString() || false
}

const access = accessControl()

// Routes
app.get('/login', (req, res) => {
    res.send('login')
})

app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user) => {
        if (err) return next(err)
        if (!user) {
            return res.status(401).json({
                error: 'Email or password is incorrect.',
            })
        }
        req.logIn(user, function (err) { // <-- Log user in
            next();
        });


    })(req, res, next)
}, function (req, res) {
    res.send('dashboard')
})


app.get('/dashboard', [isAuthenticated, access.middleware()], (req, res) => {
    res.send('dashboard')
})


app.get('/admin', [isAuthenticated, access.middleware()], (req, res) => {
    res.send('admin')
})

app.get('/status', (request, response) => {
    access.userRoles(getCurrentUserId(request), (error, roles) => {
        response.send(`User: ${JSON.stringify(request.user)} Roles: ${JSON.stringify(roles)}`)
    })
})

// Start Server
const port = process.env.APP_PORT || 3335
const host = process.env.APP_URL || 'localhost'

app.listen(port, host, () => {
    console.log(`Listening on ${host}:${port}`)
})

module.exports = app