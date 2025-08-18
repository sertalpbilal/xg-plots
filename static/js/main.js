var app = new Vue({
    el: '#app',
    data: {
        game_index: undefined
    },
    computed: {
        reverse_ordered() {
            if (_.isEmpty(this.game_index)) { return []}
            return this.game_index.sort((a,b) => {
                return (new Date(b.matchTimeUTCDate)) - (new Date(a.matchTimeUTCDate))
            })
        }
    },
    methods: {
        open_game_page(e) {
            let tm = e.currentTarget.dataset.href
            window.location = tm
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

$(document).ready(() => {
    read_local_file("index.json").then((d) => {
        app.game_index = d
    })
})