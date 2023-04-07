
var app = new Vue({
    el: '#app',
    data: {
        game_id: undefined,
        game_json: undefined,
        plot_xg: plot_game_xg,
        home_color: '#000000',
        away_color: '#000000',
        home_color_options: ['#000000', '#FFFFFF', "#4e79a7","#f28e2c","#e15759","#76b7b2"],
        away_color_options: ['#000000', '#FFFFFF', "#4e79a7","#f28e2c","#e15759","#76b7b2"]
    },
    computed: {
        shots () {
            if (_.isEmpty(this.game_json)) { return []}
            return this.game_json.content.shotmap.shots
        }
    },
    methods: {
        set_colors() {
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
        },
    }
})

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
    let game_data = app.game_json
    home_id = game_data.general.homeTeam.id
    away_id = game_data.general.awayTeam.id
    xg_vals = {'home': [{'min': 0, 'xg': 0, 'pid': null, 'info': null, 'side': 'home'}], 'away': [{'min': 0, 'xg': 0, 'pid': null, 'info': 'away'}]}
    for (let shot of game_data.content.shotmap.shots) {
        let side = shot.teamId == home_id && (!shot.isOwnGoal) ? 'home' : 'away'
        let entry = _.cloneDeep(xg_vals[side].at(-1))
        // base
        // TODO: if I use d3 stepAfter, this is not needed
        entry['pid'] = null
        entry['min'] = shot.min
        entry['info'] = null
        xg_vals[side].push(entry)
        // new val
        entry = _.cloneDeep(entry)
        entry['pid'] = shot.playerId
        entry['info'] = shot
        entry['xg'] += shot.expectedGoals
        xg_vals[side].push(entry)
    }
    for (let side of ['home', 'away']) {
        let last_entry = _.cloneDeep(xg_vals[side].at(-1))
        last_entry['min'] = 91
        last_entry['pid'] = null
        last_entry['info'] = null
        xg_vals[side].push(last_entry)
    }
    
    max_xg = Math.max(xg_vals.home.at(-1).xg, xg_vals.away.at(-1).xg)

    console.log('xg vals')
    console.log(xg_vals)

    // Axis

    let plot_margin = { top: 150, left: 180,  bottom: 110, right: 180 }
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

    debugger

    // Plot
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
    league_title = game_data['general']['parentLeagueName'] + ' ' + game_data['general']['parentLeagueSeason']
    date_title = game_data['matchTimeUTC']
    overall_title = transformed(game_data.general.homeTeam.name) + ' ' + game_data.header.status.scoreStr + ' ' + transformed(game_data.general.awayTeam.name)

    plot_area.append("foreignObject")
        .attr("x", 0)
        .attr("y", -plot_margin.top)
        .attr("width", plot_width)
        .attr("height", plot_margin.top)
        .html(function(d) {
            return `
            <div class="outer">
                <div class="w-100 row no-gutters">
                    <div class="col text-right d-flex justify-content-end">
                        <div class="d-flex flex-column mr-10">
                            <span class="teamline" style="color: ${side_color('home')}">${transformed(game_data.general.homeTeam.name)}</span>
                            <span class="text-center xgline">${xg_vals.home.at(-1).xg.toFixed(2)} xG</span>
                        </div>
                        <div class="crest"><img class="crestimg" src="${game_data.header.teams[0].imageUrl}" /></div>
                    </div>
                    <div class="col-2 d-flex flex-column justify-content-center">
                        <span class="scoreline">${game_data.header.status.scoreStr}</span>
                    </div>
                    <div class="col text-left d-flex">
                        <div class="crest mr-10"><img class="crestimg" src="${game_data.header.teams[1].imageUrl}" /></div>
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


    // Credit
    plot_area.append("foreignObject")
    .attr("x", 0)
    .attr("y", plot_height + 30)
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
}

var drag = d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);

