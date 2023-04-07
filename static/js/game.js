
var app = new Vue({
    el: '#app',
    data: {
        game_id: undefined,
        game_json: undefined,
        plot_xg: plot_game_xg,
        home_color: '#000000',
        away_color: '#000000'
    },
    computed: {
        set_colors() {
            this.home_color = this.game_json.general.teamColors.home;
            this.away_color = this.game_json.general.teamColors.away;
        },
        shots () {
            if (_.isEmpty(this.game_json)) { return []}
            return this.game_json.content.shotmap.shots
        }
    },
    methods: {

    }
})

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
            .attr("font-size", "20pt")
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

    // Plot
    plot_area.selectAll()
        .data(['home', 'away'])
        .enter()
        .append("path")
        .style('stroke', d => game_data.general.teamColors[d])
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
        .style('stroke', d => game_data.general.teamColors[d.side])
        .attr('class', 'goal-circle')
    single_goal.append("foreignObject")
        .attr("x", d => x(d.min) - 160)
        .attr("y", d => y(d.xg) - 50)
        .attr("width", 140)
        .attr("height", 50)
        .html(function(d) {
            return `
            <div class="outer goal-text d-flex flex-column">
                <span class="w-100 text-center box-name" style="color: ${game_data.general.teamColors[d.side]}">${d.info.lastName}</span>
                <span class="w-100 text-center box-value">${d.info.expectedGoals.toFixed(3)} xG</span>
            </div>
            `
        })

    // Titles
    // Labels
    league_title = game_data['general']['parentLeagueName'] + ' ' + game_data['general']['parentLeagueSeason']
    date_title = game_data['matchTimeUTC']
    overall_title = game_data.general.homeTeam.name + ' ' + game_data.header.status.scoreStr + ' ' + game_data.general.awayTeam.name

    plot_area.append("foreignObject")
        .attr("x", 0)
        .attr("y", -plot_margin.top)
        .attr("width", plot_width)
        .attr("height", plot_margin.top)
        .html(function(d) {
            return `
            <div class="outer">
                <div class="w-100 row no-gutters">
                    <div class="col text-right">
                        <span class="teamline mr-10">${game_data.general.homeTeam.name}</span>
                        <span class="crest"><img class="crestimg" src="${game_data.header.teams[0].imageUrl}" /></span>
                    </div>
                    <div class="col-2 d-flex flex-column">
                        <span class="scoreline">${game_data.header.status.scoreStr}</span>
                        <span class="xgline">${xg_vals.home.at(-1).xg.toFixed(2)}&nbsp;&nbsp;xG&nbsp;&nbsp;${xg_vals.away.at(-1).xg.toFixed(2)}</span>
                    </div>
                    <div class="col text-left">
                        <span class="crest mr-10"><img class="crestimg" src="${game_data.header.teams[1].imageUrl}" /></span>
                        <span class="teamline">${game_data.general.awayTeam.name}</span>
                    </div>
                </div>
            </div>
            `
            // return `
            // <div class="outer">
            //     <div class="inner w-100 text-center">
            //         <span class="scoreline">${ overall_title }</span>
            //     </div>
            // </div>
            // `
        })


    // Credit

    return

    // Axis
    // const x = d3.scaleBand().domain(gws).range([0, width]).paddingInner(0.05).paddingOuter(0)
    svg.append('g')
        //.attr('transform', 'translate(0,' + height + ')')
        .attr("id", "x-axis-holder")
        .attr("class", "axis-holder")
        .call(
            d3.axisBottom(x)
            .tickSize(0)
            .tickFormat((i) => i == 0 ? "Start" : "GW" + i)
        )
        .attr("transform",
            "translate(0," + height +")");

    let ptype = app.plot_type
    let max_val = d3.max(app.processed_list.map(i => Object.values(i[ptype])).flat().map(i => Math.abs(i)))
    let yrange = d3.extent(app.processed_list.map(i => Object.values(i[ptype])).flat())

    // const y = d3.scaleLinear().domain([-max_val*1.1, max_val]).range([height, 0])
    // const y = d3.scaleLinear().domain([yrange[0]*1.1, yrange[1]*1.1]).range([height, 0])
    
    svg.append('g')
        .attr("id", "y-axis-holder")
        .attr("class", "axis-holder")
        .call(
            d3.axisLeft(y)
            .tickSize(0)
        )

    // tick label
    svg
        // .call(g => g.selectAll(".tick line")
        //     .attr("stroke-opacity", 0.2)
        //     .attr("stroke-dasharray", "3,5")
        //     .attr("stroke", "#9a9a9a")
        // )
        .call(g => g.selectAll(".tick text")
            .attr("font-size", "6pt")
            .attr("fill", "black"))
        .call(g => g.selectAll("#x-axis-holder .domain")
            .attr("stroke-opacity", 0))


    // plot
    // let plot_area = svg.append("g")

    
    let rel_player = app.processed_list.filter(i => i.total_score > 5)
    let data = rel_player.map(i => [{'id': i.id, 'gw': 0, 'value': 0}].concat(Object.entries(i[ptype]).map(j => {return {'id': i.id, 'gw': parseInt(j[0]), 'value': parseFloat(j[1])}})))

    let single_player = plot_area.append('g')
        .selectAll()
        .data(data)
        .enter()

    single_player.append("path")
        .attr("data-player-id", (d) => d[0].id)
        .datum(d => d)
        .attr("fill", "none")
        .attr("class", "regular-line")
        // .attr("stroke", "blue")
        // .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .curve(d3.curveNatural)
            // .curve(d3.curveLinear)
            .x((d) => x(d.gw) + x.bandwidth() / 2)
            .y((d) => y(d.value))
        )
        .on('click', (e,d) => {
            if (!app.highlighted_players.includes(d[0].id)) {
                app.highlighted_players.push(d[0].id)
                app.plot_chart()
            }
        })

    // 0 line # before higlights!
    plot_area.append("line")
        .attr("x1", 0)
        .attr("y1", y(0))
        .attr("x2", width)
        .attr("y2", y(0))
        .attr("class", "zero-line")



    // higlighted players
    let raw_hdata = app.processed_list.filter(i => highlighted_players.includes(i.id))

    let hcolor = d3.scaleOrdinal().domain(raw_hdata.map(i => i.id)).range(d3.schemeTableau10)

    let hdata = raw_hdata.map(i => [{'id': i.id, 'gw': 0, 'value': 0}].concat(Object.entries(i[ptype]).map(j => {return {'id': i.id, 'gw': parseInt(j[0]), 'value': parseFloat(j[1])}})))

    let h_player = plot_area.append('g')
        .selectAll()
        .data(hdata)
        .enter()

    h_player.append("path")
        .attr("data-player-id", (d) => d[0].id)
        .attr("stroke", (d) => hcolor(d[0].id))
        .datum(d => d)
        .attr("fill", "none")
        .attr("class", "highlighted-line")
        // .attr("stroke", "blue")
        // .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .curve(d3.curveNatural)
            // .curve(d3.curveLinear)
            .x((d) => x(d.gw) + x.bandwidth() / 2)
            .y((d) => y(d.value))
        )
        .on('click', (e,d) => {
            if (app.highlighted_players.includes(d[0].id)) {
                app.removePlayer(d[0].id)
                app.plot_chart()
            }
        })

    let h_circles = plot_area.append('g')
        .selectAll()
        .data(hdata)
        .enter()

    h_circles.selectAll()
        .data(d => d)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(d.gw) + x.bandwidth() / 2)
        .attr("cy", (d) => y(d.value))
        .attr("r", 4)
        .style("fill", (d) => hcolor(d.id))
        .style("stroke", "white")
        .style("stroke-width", 1)
        .style("opacity", 1);

    // name line
    let hdata_with_y = raw_hdata.map(i => { return {...i, final_pos: i[ptype][app.final_gw] } })
    let pnames = plot_area.append('g')
        .selectAll()
        .data(hdata_with_y)
        .enter()
    
    pnames
        .append('g')
        .attr("class", "hg-player")
        .style("cursor", "move")
        .append('text')
        .attr("x", width - x.bandwidth() / 2 + 4)
        .attr("y", (d) => y(d.final_pos))
        .attr("text-anchor", "left")
        .attr("alignment-baseline", "middle")
        .attr("dominant-baseline", "middle")
        .text((d) => d.name)
        .style("font-size", "6pt")
        .style("fill", (d) => hcolor(d.id))
        .style("opacity", 1);

    svg.selectAll(".hg-player").call(drag)
    
    let plot_title = {
        'crp_diff_cxp': 'FPL 2022/2023 | Cumulative FPL Points vs Post-GW Expected Points Difference',
        'crp_diff_cpp': 'FPL 2022/2023 | Cumulative FPL Points vs Pre-GW Predicted Points Difference',
        'cxp_diff_cpp': 'FPL 2022/2023 | Cumulative Post-GW Expected Points vs Pre-GW Predicted Points Difference'
    }[ptype]

    svg.append('g')
        .append('text')
        .attr("x", 0)
        .attr("y", -30)
        .attr("text-anchor", "left")
        .attr("alignment-baseline", "middle")
        .attr("dominant-baseline", "middle")
        .text(plot_title)
        .attr("class", "plot-title-main");

    let plot_subtitle = {
        'crp_diff_cxp': `Difference between FPL points and expected points using underlying stats | Expectation data by ${app.use_fix ? "FantasyFootballFix" : "@FPL_Data and fbref"} | Viz by @sertalpbilal`,
        // 'crp_diff_cpp': 'Difference between FPL points and predicted points by FPLReview | Prediction data by @fplreview | Viz by @sertalpbilal',
        'crp_diff_cpp': 'Difference between FPL points and predicted points by Mikkel Tokvam | Prediction data by @mikkeltokvam | Viz by @sertalpbilal',
        // 'cxp_diff_cpp': 'Difference between expected points and predicted points | Expectation data by @FPL_Data and fbref | Prediction data by @fplreview | Viz by @sertalpbilal'
        'cxp_diff_cpp': `Difference between expected points and predicted points | Expectation data by ${app.use_fix ? "FantasyFootballFix" : "@FPL_Data and fbref"} | Prediction data by @mikkeltokvam | Viz by @sertalpbilal`
    }[ptype]

    svg.append('g')
        .append('text')
        .attr("x", 0)
        .attr("y", -15)
        .attr("text-anchor", "left")
        .attr("alignment-baseline", "middle")
        .attr("dominant-baseline", "middle")
        .text(plot_subtitle)
        .attr("class", "plot-title-sub");

    // svg.append('image')
    //     .attr('xlink:href', 'static/img/epl_logo.png')
    //     .attr('width', 50)
    //     .attr('height', 50)
    //     // .style('filter', 'drop-shadow(2px 4px 6px black)')
    //     .attr('x', width-85)
    //     .attr('y', -50)

    svg_actual.append('g').style("transform", `translate(${raw_width-140}px, 10px)`).html(fpl_logo.replace("WREPLACE", 100).replace("HREPLACE", 100/453*104))

    d3.selectAll("#line_plot #y-axis-holder g") 
        .append("line")
        .attr("class", "gridline")
        .attr("x1", 0) 
        .attr("y1", 0)
        .attr("x2", width)
        .attr("y2", 0)
        .attr("stroke", "black")
        .attr("stroke-opacity", 0.1)
        .attr("stroke-dasharray", "3,5");

    d3.selectAll("#line_plot #x-axis-holder g") 
        .append("line")
        .attr("class", "gridline")
        .attr("x1", 0) 
        .attr("y1", -height)
        .attr("x2", 0)
        .attr("y2", 0)
        .attr("stroke", "black")
        .attr("stroke-opacity", 0.1)
        .attr("stroke-dasharray", "3,5");


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
            app.plot_xg()
        })
    })

})
