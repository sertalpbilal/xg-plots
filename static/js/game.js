
var app = new Vue({
    el: '#app',
    data: {
        game_id: undefined,
        game_json: undefined
    },
    computed: {
        shots () {
            if (_.isEmpty(this.game_json)) { return []}
            return this.game_json.content.shotmap.shots
        }
    },
    methods: {
        plot_xg() {

        }
    }
})

function read_local_file(url) {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: "GET",
            url: url,
            async: true,
            success: function(data) {
                resolve(data);
            },
            error: function() {
                reject("No data");
            }
        });
    });
}

async function fetch_game_json() {
    return read_local_file('data/' + app.game_id + '.json').then((data) => {
        app.game_json = data
    })
}


$(document).ready(() => {
    var queryDict = {}
    location.search.substr(1).split("&").forEach((item) => {
        queryDict[item.split("=")[0]] = item.split("=")[1]
    })
    console.log(queryDict)
    app.game_id = queryDict['id']

    Promise.all([
        fetch_game_json()
    ]).then(() => {
        console.log('ready')
        app.$nextTick(() => {
            app.plot_xg()
        })
    })

})
