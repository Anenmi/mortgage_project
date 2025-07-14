from flask import Flask, render_template_string, request, jsonify
from mortgage_calculator import MortgageCalculator
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Удалён TEMPLATE и маршрут '/'

def get_table_html(calc: MortgageCalculator) -> str:
    res = calc.print_table(return_html=True)
    return res if res is not None else ''

def get_plot_html(calc: MortgageCalculator) -> str:
    res = calc.plot_graph(return_html=True)
    return res if res is not None else ''

@app.route('/api/calculate', methods=['POST'])
def api_calculate():
    print('--- /api/calculate called ---')
    print('Request JSON:', request.json)
    data = request.json
    interest_rate = float(data['interest_rate'])
    monthly_payment = int(data['monthly_payment'])
    initial_payment = int(data['initial_payment'])
    min_initial_payment_percentage = float(data['min_initial_payment_percentage'])
    min_years = int(data['min_years'])
    max_years = int(data['max_years'])
    step = int(data.get('step', 0)) if 'step' in data and data['step'] else None
    calc = MortgageCalculator(interest_rate, monthly_payment, initial_payment, min_initial_payment_percentage)
    if step:
        calc.calculate(min_years, max_years, step)
    else:
        calc.calculate(min_years, max_years)
    return jsonify(calc.results)

@app.route('/api/annuity_payments', methods=['POST'])
def api_annuity_payments():
    try:
        print('--- /api/annuity_payments called ---')
        print('Request JSON:', request.json)
        data = request.json
        interest_rate = float(data['interest_rate'])
        monthly_payment = int(data['monthly_payment'])
        initial_payment = int(data['initial_payment'])
        min_initial_payment_percentage = float(data['min_initial_payment_percentage'])
        years = int(data['years'])
        mode = data.get('mode', 'months')
        calc = MortgageCalculator(interest_rate, monthly_payment, initial_payment, min_initial_payment_percentage)
        plot_data, plot_layout = calc.plot_annuity_payments_data(years, mode)
        return jsonify({'data': plot_data, 'layout': plot_layout})
    except Exception as e:
        import traceback
        print('ERROR:', e)
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')