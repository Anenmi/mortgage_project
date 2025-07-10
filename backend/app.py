from flask import Flask, render_template_string, request, jsonify
from mortgage_calculator import MortgageCalculator
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

TEMPLATE = '''
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Ипотечный калькулятор</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/nouislider@15.7.1/dist/nouislider.min.css">
    <style>
        body { font-family: Arial, sans-serif; background: #f8f9fa; margin: 0; padding: 0; }
        .container { width: 100vw; max-width: none; margin: 0; border-radius: 0; box-shadow: none; padding: 30px 40px; background: #fff; }
        h1 { color: #264653; text-align: center; }
        form { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; margin-bottom: 30px; }
        label { font-weight: bold; color: #264653; }
        input[type=number] { padding: 6px 10px; border: 1px solid #bdbdbd; border-radius: 5px; width: 180px; }
        input[type=submit] { background: #264653; color: #fff; border: none; border-radius: 5px; padding: 10px 30px; font-size: 16px; cursor: pointer; }
        input[type=submit]:hover { background: #00cc96; color: #fff; }
        .result-block { margin-top: 30px; }
        hr { border: none; border-top: 2px solid #e0e0e0; margin: 30px 0 10px 0; }
        .slider-label { margin-bottom: 8px; display: block; color: #264653; font-weight: bold; }
        #years-slider { margin: 0 auto 8px auto; width: 360px; }
        .slider-values { font-size: 15px; color: #264653; margin-bottom: 10px; }
        @media (max-width: 600px) { #years-slider { width: 95vw; } }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/nouislider@15.7.1/dist/nouislider.min.js"></script>
</head>
<body>
<div class="container">
    <h1>Ипотечный калькулятор</h1>
    <form method="post" id="mortgage-form">
        <div>
            <label>Ставка (%):<br><input type="number" name="interest_rate" step="0.01" min="0" required value="{{ interest_rate }}"></label>
        </div>
        <div>
            <label>Ежемесячный платеж (руб.):<br><input type="number" name="monthly_payment" min="0" required value="{{ monthly_payment }}" inputmode="numeric" pattern="[0-9]*"></label>
        </div>
        <div>
            <label>Первоначальный взнос (руб.):<br><input type="number" name="initial_payment" min="0" required value="{{ initial_payment }}" inputmode="numeric" pattern="[0-9]*"></label>
        </div>
        <div>
            <label>Минимальный первоначальный взнос (%):<br><input type="number" name="min_initial_payment_percentage" min="0" max="100" step="1" required value="{{ min_initial_payment_percentage }}" inputmode="numeric" pattern="[0-9]*"></label>
        </div>
        <div style="flex-basis: 100%; text-align: center;">
            <span class="slider-label">Срок (лет):</span>
            <div id="years-slider"></div>
            <div class="slider-values">
                <span>от <span id="minYears">{{ min_years }}</span> до <span id="maxYears">{{ max_years }}</span> лет</span>
            </div>
            <input type="hidden" name="min_years" id="min_years_input" value="{{ min_years }}">
            <input type="hidden" name="max_years" id="max_years_input" value="{{ max_years }}">
        </div>
        <div style="align-self: flex-end;">
            <input type="submit" value="Рассчитать">
        </div>
    </form>
    <hr>
    {% if table_html %}
    <div class="result-block">
        {{ table_html|safe }}
    </div>
    {% endif %}
    {% if plot_html %}
    <div class="result-block">
        {{ plot_html|safe }}
    </div>
    {% endif %}
</div>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        var yearsSlider = document.getElementById('years-slider');
        var minYears = document.getElementById('minYears');
        var maxYears = document.getElementById('maxYears');
        var minYearsInput = document.getElementById('min_years_input');
        var maxYearsInput = document.getElementById('max_years_input');
        if (yearsSlider) {
            noUiSlider.create(yearsSlider, {
                start: [parseInt(minYearsInput.value), parseInt(maxYearsInput.value)],
                connect: true,
                step: 1,
                range: {
                    'min': 1,
                    'max': 30
                },
                format: {
                    to: function (value) { return Math.round(value); },
                    from: function (value) { return Math.round(value); }
                }
            });
            yearsSlider.noUiSlider.on('update', function(values, handle) {
                minYears.textContent = values[0];
                maxYears.textContent = values[1];
                minYearsInput.value = values[0];
                maxYearsInput.value = values[1];
            });
        }
    });
</script>
</body>
</html>
'''

def get_table_html(calc: MortgageCalculator) -> str:
    res = calc.print_table(return_html=True)
    return res if res is not None else ''

def get_plot_html(calc: MortgageCalculator) -> str:
    res = calc.plot_graph(return_html=True)
    return res if res is not None else ''

@app.route('/', methods=['GET', 'POST'])
def index():
    # Значения по умолчанию
    defaults = dict(
        interest_rate=16.5,
        monthly_payment=60000,
        initial_payment=1000000,
        min_initial_payment_percentage=20,
        min_years=5,
        max_years=10
    )
    table_html = plot_html = None
    # Инициализация переменных значениями по умолчанию
    interest_rate = defaults['interest_rate']
    monthly_payment = defaults['monthly_payment']
    initial_payment = defaults['initial_payment']
    min_initial_payment_percentage = defaults['min_initial_payment_percentage']
    min_years = defaults['min_years']
    max_years = defaults['max_years']
    if request.method == 'POST':
        try:
            interest_rate = float(request.form['interest_rate'])
            monthly_payment = int(request.form['monthly_payment'])
            initial_payment = int(request.form['initial_payment'])
            min_initial_payment_percentage = float(request.form.get('min_initial_payment_percentage', 20))
            min_years = int(request.form['min_years'])
            max_years = int(request.form['max_years'])
            calc = MortgageCalculator(interest_rate, monthly_payment, initial_payment, min_initial_payment_percentage)
            calc.calculate(min_years, max_years)
            table_html = get_table_html(calc)
            plot_html = get_plot_html(calc)
        except Exception as e:
            table_html = f'<div style="color:red;">Ошибка: {e}</div>'
            plot_html = None
        return render_template_string(TEMPLATE,
                                      interest_rate=interest_rate,
                                      monthly_payment=monthly_payment,
                                      initial_payment=initial_payment,
                                      min_initial_payment_percentage=min_initial_payment_percentage,
                                      min_years=min_years,
                                      max_years=max_years,
                                      table_html=table_html,
                                      plot_html=plot_html)
    else:
        return render_template_string(TEMPLATE, **defaults, table_html=None, plot_html=None)

@app.route('/api/calculate', methods=['POST'])
def api_calculate():
    data = request.json
    interest_rate = float(data['interest_rate'])
    monthly_payment = int(data['monthly_payment'])
    initial_payment = int(data['initial_payment'])
    min_initial_payment_percentage = float(data.get('min_initial_payment_percentage', 20))
    min_years = int(data['min_years'])
    max_years = int(data['max_years'])
    step = int(data.get('step', 0)) if 'step' in data and data['step'] else None
    calc = MortgageCalculator(interest_rate, monthly_payment, initial_payment)
    if step:
        calc.calculate(min_years, max_years, step)
    else:
        calc.calculate(min_years, max_years)
    return jsonify(calc.results)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')