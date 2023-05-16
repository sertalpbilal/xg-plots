
var app = new Vue({
    el: '#app',
    data: {
        game_id: undefined,
        game_json: undefined,
        plot_xg: plot_game_xg,
        home_color: '#000000',
        away_color: '#000000',
        home_color_options: ['#000000', '#FFFFFF', "#4e79a7","#f28e2c","#e15759","#76b7b2"],
        away_color_options: ['#000000', '#FFFFFF', "#4e79a7","#f28e2c","#e15759","#76b7b2"],
        highlight_player: undefined,
        exclude_pen: false,
        taking_screenshot: false
    },
    computed: {
        home_team_id() {
            if (_.isEmpty(this.game_json)) { return undefined}
            return this.game_json.general.homeTeam.id
        },
        away_team_id() {
            if (_.isEmpty(this.game_json)) { return undefined}
            return this.game_json.general.awayTeam.id
        },
        shots () {
            if (_.isEmpty(this.game_json)) { return []}
            return this.game_json.content.shotmap.shots
        },
        game_xg() {
            if (_.isEmpty(this.game_json)) { return {}}

            let game_data = this.game_json
            let home_id = game_data.general.homeTeam.id
            let away_id = game_data.general.awayTeam.id
            xg_vals = {'home': [{'min': 0, 'xg': 0, 'pid': null, 'info': null, 'side': 'home'}], 'away': [{'min': 0, 'xg': 0, 'pid': null, 'info': null, 'side': 'away'}]}
            for (let shot of game_data.content.shotmap.shots) {
                let side = shot.teamId == home_id && (!shot.isOwnGoal) ? 'home' : 'away'
                let entry = _.cloneDeep(xg_vals[side].at(-1))
                // base
                // TODO: if I use d3 stepAfter, this is not needed
                entry['pid'] = null
                entry['min'] = shot.min
                entry['info'] = null
                entry['prev_xg'] = entry.xg
                xg_vals[side].push(entry)
                // new val
                entry = _.cloneDeep(entry)
                entry['pid'] = shot.playerId
                entry['info'] = shot
                entry['prev_xg'] = entry.xg
                entry['xg'] += shot.expectedGoals
                xg_vals[side].push(entry)
            }
            for (let side of ['home', 'away']) {
                let last_entry = _.cloneDeep(xg_vals[side].at(-1))
                last_entry['min'] = 91
                last_entry['pid'] = null
                last_entry['info'] = null
                last_entry['prev_xg'] = last_entry.xg
                xg_vals[side].push(last_entry)
            }

            return xg_vals

        },
        players_by_xg() {
            if (_.isEmpty(this.game_xg)) { return []}
            let game_xg = _.cloneDeep(this.game_xg)
            let all_shots = game_xg['home'].concat(game_xg['away']).filter(i => i.info)
            for (let i of all_shots) {
                if (i.info.expectedGoals == null) {
                    i.info.expectedGoals = 0
                }
            }
            let grouped = _.groupBy(all_shots, 'info.playerId')
            return _.orderBy(_.map(grouped, i => { return {values: i, 'total_xg':_.sumBy(i, 'info.expectedGoals'), 'best_xg': _.maxBy(i, 'info.expectedGoals').info.expectedGoals, 'shots': i.length, 'side': i[0].side, 'name': i[0].info.lastName}}), 'total_xg', 'desc')

        }
    },
    methods: {
        set_colors() {
            let t = this.game_json.general.teamColors
            if (Array.isArray(t)) {
                this.home_color_options.push(this.game_json.general.teamColors[0].color)
                this.home_color_options.push(this.game_json.general.teamColors[0].colorAlternate)
                this.home_color_options.push(this.game_json.general.teamColors[0].colorAway)
                this.home_color_options.push(this.game_json.general.teamColors[0].colorAwayAlternate)
                this.home_color = this.game_json.general.teamColors[0].color;

                this.away_color_options.push(this.game_json.general.teamColors[1].color)
                this.away_color_options.push(this.game_json.general.teamColors[1].colorAlternate)
                this.away_color_options.push(this.game_json.general.teamColors[1].colorAway)
                this.away_color_options.push(this.game_json.general.teamColors[1].colorAwayAlternate)
                this.away_color = this.game_json.general.teamColors[1].color;
            }
            else if (t?.homeColors) {
                debugger
                this.home_color_options.push(this.game_json.general.teamColors.homeColors.color)
                this.home_color_options.push(this.game_json.general.teamColors.homeColors.colorAlternate)
                this.home_color_options.push(this.game_json.general.teamColors.homeColors.colorAway)
                this.home_color_options.push(this.game_json.general.teamColors.homeColors.colorAwayAlternate)
                this.home_color = this.game_json.general.teamColors.home;

                this.away_color_options.push(this.game_json.general.teamColors.awayColors.color)
                this.away_color_options.push(this.game_json.general.teamColors.awayColors.colorAlternate)
                this.away_color_options.push(this.game_json.general.teamColors.awayColors.colorAway)
                this.away_color_options.push(this.game_json.general.teamColors.awayColors.colorAwayAlternate)
                this.away_color = this.game_json.general.teamColors.away;
            }
            else {
                this.home_color_options.push(this.game_json.general.teamColors.lightMode.home)
                this.home_color = this.game_json.general.teamColors.lightMode.home;

                this.away_color_options.push(this.game_json.general.teamColors.lightMode.away)
                this.away_color = this.game_json.general.teamColors.lightMode.away;
            }
            
        },
        toggle_highlight(v) {
            if (this.highlight_player == v) {
                this.highlight_player = undefined
            }
            else {
                this.highlight_player = v
            }
            this.plot_xg()
        },
        download_image() {

            app.taking_screenshot = true

            setTimeout(() => {
                var node = document.getElementById('xg_race');
                node.style.width = '1600px'

                domtoimage
                    .toPng(node, copyDefaultStyles=true)
                    .then(function (dataUrl) {
                        var img = new Image();
                        img.src = dataUrl;
                        var link = document.createElement('a');
                        link.href = dataUrl;
                        let download_name = app.game_json.seo.path + ".jpg"
                        link.download = download_name; // 'download.jpg';
                        document.body.appendChild(link);
                        setTimeout(() => {
                            link.click();
                            document.body.removeChild(link);
                            node.style.width = ''
                            app.taking_screenshot = false
                        }, 300);
                    })
                    .catch(function (error) {
                        console.error('oops, something went wrong!', error);
                    });
            }, 100)

            
        }
    }
})

function download_as_image(img) {
    
}

let name_transform = {
    'AFC Bournemouth': 'Bournemouth',
    'Brighton & Hove Albion': 'Brighton',
    'Tottenham Hotspur': 'Tottenham',
    'Wolverhampton Wanderers': 'Wolves'
}
let transformed = (e) => name_transform[e] ? name_transform[e]: e

function plot_game_xg() {
    
    $("#xg_race").empty()

    let wip = false;

    let raw_width = 1600
    let raw_height = 1200

    let margin = { top: 20, left: 20,  bottom: 40, right: 20 },
            width = raw_width - margin.left - margin.right,
            height = raw_height - margin.top - margin.bottom;

    const svg_actual = d3.select("#xg_race")
        .append("svg")
        .attr("class", "svg-plot")
        .attr("viewBox", `0 0  ${(raw_width)} ${(raw_height)}`)

    if (wip) {
        svg_actual.append('rect').attr("x", 0).attr("y", 0).attr("width", raw_width).attr("height", raw_height).attr("fill", "blue").style("fill-opacity", 0.1)
    }

    const svg = svg_actual.append('g')
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    if (wip) {
        svg.append('rect').attr("x", 0).attr("y", 0).attr("width", width).attr("height", height).attr("fill", "red").style("fill-opacity", 0.1)
    }

    // Data
    let game_data = _.cloneDeep(this.game_json)
    let xg_vals = app.game_xg
    
    max_xg = Math.max(xg_vals.home.at(-1).xg, xg_vals.away.at(-1).xg)

    console.log('xg vals')
    console.log(xg_vals)

    // Axis

    let plot_margin = { top: 150, left: 150,  bottom: 110, right: 80 }
    let plot_area = svg.append('g').attr("transform", "translate(" + plot_margin.left + "," + plot_margin.top + ")")
    let plot_width = width-plot_margin.left-plot_margin.right
    let plot_height = height-plot_margin.top-plot_margin.bottom
    plot_area.append('rect')
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", plot_width)
        .attr("height", plot_height)
        .attr("fill", "white")
        .style("fill-opacity", 0.5)

    const x = d3.scaleLinear().domain([0, 91]).range([0, plot_width])
    plot_area.append('g')
        //.attr('transform', 'translate(0,' + height + ')')
        .attr("id", "x-axis-holder")
        .attr("class", "axis-holder")
        .call(
            d3.axisBottom(x)
            .tickValues([0,15,30,45.5,60,75,91])
            .tickFormat((i) => (i == 45.5 ? 45 : i == 91 ? 90 : i) + "'")
            .tickSize(25)
        )
        .attr("transform",
            "translate(0," + plot_height +")");

    let graph_max = Math.max(max_xg+0.25, max_xg*0.1)
    const y = d3.scaleLinear().domain([0, graph_max]).range([plot_height, 0])
    plot_area.append('g')
        .attr("id", "y-axis-holder")
        .attr("class", "axis-holder")
        .call(
            d3.axisLeft(y)
            .tickSize(25)
            .tickValues(_.range(0, graph_max, 0.5))
        )


    // Axis Style
    svg
        .call(g => g.selectAll(".tick line")
            .attr("stroke-opacity", 0)
        )
        .call(g => g.selectAll(".domain")
            .attr("stroke-opacity", 0)
        )
        .call(g => g.selectAll(".tick text")
            .attr("font-size", "24pt")
            .attr("fill", "black"))


    // guides
    let minor_x = [15,30,60,75]
    let major_x = [45.5]
    let minor_y = _.range(0, graph_max, 0.5).filter(i => i!=0)
    plot_area.selectAll()
        .data(minor_x)
        .enter()
        .append("line")
        .attr('x1', d => x(d))
        .attr('x2', d => x(d))
        .attr('y1', d => y(0))
        .attr('y2', d => y(graph_max))
        .attr("class", "minor-x")
    plot_area.selectAll()
        .data(major_x)
        .enter()
        .append("line")
        .attr('x1', d => x(d))
        .attr('x2', d => x(d))
        .attr('y1', d => y(0))
        .attr('y2', d => y(graph_max))
        .attr("class", "major-x")
    plot_area.selectAll()
        .data(minor_y)
        .enter()
        .append("line")
        .attr('x1', d => x(0))
        .attr('x2', d => x(91))
        .attr('y1', d => y(d))
        .attr('y2', d => y(d))
        .attr("class", "minor-x")

    let side_color = (e) => e == 'home' ? app.home_color : app.away_color

    // Plot

    // colored regions
    // luck regions

    plot_area.append("clipPath")
      .attr("id", `below-away`)
        .append("path")
        .datum(xg_vals['away'])
        .attr("d", d3.area()
            .x((d) => x(d.min))
            .y1(d => y(d.xg))
            .y0(d => plot_height)
            );

    plot_area.append("clipPath")
        .attr("id", `above-away`)
        .append("path")
        .datum(xg_vals['away'])
        .attr("d", d3.area()
            .x((d) => x(d.min))
            .y1(d => y(d.xg))
            .y0(d => 0)
            );

    plot_area.append('g')
        .append("path")
        .datum(xg_vals['home'])
        .attr("fill", side_color('away'))
        .attr("fill-opacity", 0.2)
        .attr("clip-path", "url(#below-away)")
        .attr("d", d3.area()
            .x((d) => x(d.min))
            .y1(d => y(d.xg))  
            .y0(d => 0)
            );

    plot_area.append('g')
        .append("path")
        .datum(xg_vals['home'])
        .attr("fill", side_color('home'))
        .attr("fill-opacity", 0.2)
        .attr("clip-path", "url(#above-away)")
        .attr("d", d3.area()
            .x((d) => x(d.min))
            .y1(d => y(d.xg))  
            .y0(d => plot_height)
            );


    // highlights
    let hp = app.highlight_player
    if (hp != undefined) {
        let all_shots = _.cloneDeep(xg_vals['home'].concat(xg_vals['away']).filter(i => i.info))
        let player_actions = all_shots.filter(i => i.info.playerId == hp)

        plot_area.selectAll()
            .data(player_actions)
            .enter()
            .append("line")
            // .style('stroke', d => side_color(d))
            .attr("fill", "none")
            .attr("class", "highlight-line")
            .attr("x1", d => x(d.min))
            .attr("x2", d => x(d.min))
            .attr("y1", d => y(d.prev_xg))
            .attr("y2", d => y(d.xg))

    }


    // lines

    plot_area.selectAll()
        .data(['home', 'away'])
        .enter()
        .append("path")
        .style('stroke', d => side_color(d))
        // .attr("data-player-id", (d) => d[0].id)
        .datum(d => xg_vals[d].map(i => { return {...i, 'side': d}}))
        .attr("fill", "none")
        .attr("class", "xg-line")
        // .attr("stroke", "blue")
        // .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            // .curve(d3.curveNatural)
            // .curve(d3.curveLinear)
            .x((d) => x(d.min))
            .y((d) => y(d.xg))
        )
        
        // .on('click', (e,d) => {
        //     if (!app.highlighted_players.includes(d[0].id)) {
        //         app.highlighted_players.push(d[0].id)
        //         app.plot_chart()
        //     }
        // })


    


    // Goals
    let single_goal = plot_area.selectAll()
        .data(['home', 'away'])
        .enter()
        .append('g')
        .selectAll()
        .data(d => {
            return xg_vals[d].filter(i => i.info?.eventType == "Goal").map(i => { return {...i, side: d}})
        })
        .enter()
    single_goal.append('circle')
        .attr('cx', d => x(d.min))
        .attr('cy', d => y(d.xg))
        .style('stroke', d => side_color(d.side))
        .attr('class', 'goal-circle')
    single_goal.append("foreignObject")
        .attr("x", d => x(d.min) - 160)
        .attr("y", d => y(d.xg) - 60)
        .attr("width", 140)
        .attr("height", 60)
        .html(function(d) {
            return `
            <div class="outer goal-text d-flex flex-column">
                <span class="w-100 text-center box-name" style="color: ${side_color(d.side)}">${d.info.lastName}</span>
                <span class="w-100 text-center box-value">${d.info?.expectedGoals?.toFixed(2) || '0.00'} xG</span>
            </div>
            `
        })
        .style("cursor", "move")
        .call(drag)

    // Titles
    // Labels
    game_data = _.cloneDeep(app.game_json)
    league_title = game_data.general.parentLeagueName + ' ' + game_data.general.parentLeagueSeason
    date_title = game_data['matchTimeUTC']
    overall_title = transformed(game_data.general.homeTeam.name) + ' ' + game_data.header.status.scoreStr + ' ' + transformed(game_data.general.awayTeam.name)

    // let logo_url = (v) => `https://api.allorigins.win/raw?url=${v}`
    let logo_url = (v) => `https://cors.alpscode.com/${v.replace("https://", "")}`

    get_url(game_data.header.teams[0].imageUrl).then((data) => {
        var reader = new FileReader();
        reader.readAsDataURL(data); 
        reader.onloadend = function() {
            var base64data = reader.result;                
            console.log(base64data);
            document.querySelector("#home-image").src = base64data
        }  
    })

    get_url(game_data.header.teams[1].imageUrl).then((data) => {
        var reader = new FileReader();
        reader.readAsDataURL(data); 
        reader.onloadend = function() {
            var base64data = reader.result;                
            console.log(base64data);
            document.querySelector("#away-image").src = base64data
        }
        
    })

    plot_area.append("foreignObject")
        .attr("x", 0)
        .attr("y", -plot_margin.top)
        .attr("width", plot_width)
        .attr("height", plot_margin.top-50)
        .html(function(d) {
            return `
            <div class="outer">
                <div class="w-100 row no-gutters">
                    <div class="col text-right d-flex justify-content-end">
                        <div class="d-flex flex-column mr-10">
                            <span class="teamline" style="color: ${side_color('home')}">${transformed(game_data.general.homeTeam.name)}</span>
                            <span class="text-center xgline">${xg_vals.home.at(-1).xg.toFixed(2)} xG</span>
                        </div>
                        <div class="crest"><img class="crestimg" id="home-image" src="${logo_url(game_data.header.teams[0].imageUrl.replace("https://", ""))}" /></div>
                    </div>
                    <div class="col-2 d-flex flex-column justify-content-center">
                        <span class="scoreline">${game_data.header.status.scoreStr}</span>
                    </div>
                    <div class="col text-left d-flex">
                        <div class="crest mr-10"><img class="crestimg" id="away-image" src="${logo_url(game_data.header.teams[1].imageUrl.replace("https://", ""))}" /></div>
                        <div class="d-flex flex-column">
                            <span class="teamline" style="color: ${side_color('away')}">${transformed(game_data.general.awayTeam.name)}</span>
                            <span class="text-center xgline">${xg_vals.away.at(-1).xg.toFixed(2)} xG</span>
                        </div>
                    </div>
                </div>
            </div>
            `

            // <span class="xgline">${xg_vals.home.at(-1).xg.toFixed(2)}&nbsp;&nbsp;xG&nbsp;&nbsp;${xg_vals.away.at(-1).xg.toFixed(2)}</span>

            // return `
            // <div class="outer">
            //     <div class="inner w-100 text-center">
            //         <span class="scoreline">${ overall_title }</span>
            //     </div>
            // </div>
            // `
        })

    // Axis Labels
    plot_area
        .append("text")
        .attr("class", "halftext")
        .text("1st Half")
        .attr("y", -20)
        .attr("x", x(22.25))
        .attr("text-anchor", 'middle')
        .attr("alignment-baseline", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "black")
        .style("font-size", "20pt")

    plot_area
        .append("text")
        .attr("class", "halftext")
        .text("2nd Half")
        .attr("y", -20)
        .attr("x", x(68.25))
        .attr("text-anchor", 'middle')
        .attr("alignment-baseline", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "black")
        .style("font-size", "20pt")

    plot_area
        .append("text")
        .attr("class", "halftext")
        .text("Minutes")
        .attr("y", plot_height + 80)
        .attr("x", x(45.5))
        .attr("text-anchor", 'middle')
        .attr("alignment-baseline", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "black")
        .style("font-size", "24pt")

    plot_area
        .append("text")
        .attr("class", "halftext")
        .text("Cumulative xG")
        .attr("y", 0)
        .attr("x", 0)
        .attr("text-anchor", 'middle')
        .attr("alignment-baseline", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "black")
        .style("font-size", "24pt")
        .style("transform", `translate(-100px, ${plot_height/2}px) rotate(-90deg)`)


    // Credit
    plot_area.append("foreignObject")
    .attr("x", 0)
    .attr("y", plot_height + 48)
    .attr("width", plot_width)
    .attr("height", plot_margin.top)
    .html(function(d) {
        return `
        <div class="outer text-center">
            <div class="text-center w-100 creditline">
                Viz by <i style="color: #26a7de;" class="fab fa-twitter"></i>sertalpbilal | Data by OPTA
            </div>
        </div>
        `})

}

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
            app.set_colors()
            app.plot_xg()
        })
    })

})

let proxy = "https://cors.alpscode.com"

function get_url(url) {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: "GET",
            url: `${proxy}/${url}`,
            async: true,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'X-Requested-With': 'XMLHttpRequest',
                'Referrer-Policy': 'no-referrer-when-downgrade'
            },
            xhrFields:{
                responseType: 'blob'
            },
            success: function(data) {
                resolve(data);
            },
            error: function(xhr, status, error) {
                reject(`Error when getting URL ${url} ${xhr} ${status} ${error}`)
            }
        });
    });
}


// universal drag logic
function dragstarted(event, d) {
    let item = d3.select(this)
}
function dragged(event, d) {
    let matrix = new WebKitCSSMatrix(window.getComputedStyle(d3.select(this).node()).transform)
    let current_x = matrix.m41 + event.dx
    let current_y = matrix.m42 + event.dy
    d3.select(this).style("transform", `translate(${current_x}px, ${current_y}px)`)
}

function dragended(event, d) {
    let item = d3.select(this)
    document.querySelector(".svg-plot").style.opacity = 0.99
    setTimeout(() => {
        document.querySelector(".svg-plot").style.opacity = 1
    }, 1)
    
}

var drag = d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);

