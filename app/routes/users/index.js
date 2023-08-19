// @route('/users');

const {get: getModel} = require('../../models');
const {Model, Sequelize} = require("sequelize");
async function render_user(req, res, next, bootstrap, express)
{
    if (!req.params['id'] || /[^0-9]/.test(req.params['id'])) {
        next();
        return;
    }
    let id = parseInt(req.params['id']);
    let json = res.responder;
    let admin = getModel('admins');
    /**
     * @type {Model}
     */
    let data = await admin.findOne({
        // see on admin -> Model
        attributes: [
            'id',
            'username',
            'email',
            'first_name', // use real selector
            ['last_name', 'end_name'], // change alias, use first array on real table name
            ['status', 'user_status']
        ],
        where: {id}
    }).then((e) => e);
    // console.log(typeof data.get('createdAt'));
    data ? json.ok(data) : json.notFound('User not found');
}

module.exports = (router, bootstrap, express) => {
    router.all('/:id', (req, res, next) => render_user(req, res, next, bootstrap, express));
}
