const functions = require('firebase-functions');

var serviceAccount = require('./fuguai-search-firebase-adminsdk-q878f-f95baac4b2.json')
const admin = require('firebase-admin')
// admin.initializeApp()
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://fuguai-search.firebaseio.com/'
})



//[START set group token]
exports.setGroupToken = functions.database.ref('/customTokens/{uid}/request')
  .onCreate((data, context) => {

  const uid = context.params.uid

  var user

  return admin.database().ref(`users/${uid}`).once("value")
  .then(snap => {
    if(!snap.exists()) {
      return Promise.reject('user does not exist')
    }
    user = snap.val()
    if(!user.corporateKey) {
      return Promise.reject('user does not have corporate key')
    }
    return admin.database().ref(`corporateMembers/${user.corporateKey}/${uid}`).once("value")

  }).then(snap => {
    if(snap.exists()) {
      var additionalClaims = {
        corporateKey: user.corporateKey
      }
      return admin.auth().setCustomUserClaims(uid, additionalClaims)
    }else {
      return Promise.reject('user was not a corporate member')
    }
  }).then(() => {
    return admin.database().ref(`customTokens/${uid}`).set(null)
  }).catch(function(error) {
    console.error("Error creating custom token:", error)
  })
})
//[END set group token]






//[START corporate registered]
exports.registerCorporate = functions.database.ref('/users/{uid}/corporateName')
  .onCreate((data, context) => {

  const uid = context.params.uid
  const corporateName = data.val()

  var user

  const corporateKey = admin.database().ref(`corporates`).push().key

  var promisses = []
  var p

  p = admin.database().ref(`users/${uid}/corporateKey`).set(corporateKey)
  promisses.push(p)

  p = admin.database().ref(`corporates/${corporateKey}`).set({name: corporateName})
  promisses.push(p)

  p = admin.database().ref(`corporateMembers/${corporateKey}/${uid}`).set({
    time: admin.database.ServerValue.TIMESTAMP
  })
  promisses.push(p)

  return Promise.all(promisses)
  .then(res => {

    console.log("done register corporate")

  }).catch(err => {
    console.error("register corporate error", err)
  })


})
//[END corporate registered]